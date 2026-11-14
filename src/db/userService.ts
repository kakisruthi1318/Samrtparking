import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './index.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-parking-secret-jwt-key-2026';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

export class UserService {
  // Generate signed JWT
  static generateToken(user: { userId: string; email: string; name: string }): string {
    return jwt.sign(
      { userId: user.userId, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  // Register with email and password
  static async register(name: string, email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    if (!name || !email || !password) {
      const err: any = new Error('Name, email, and password are required');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = email.trim().toLowerCase();
    const client = await pool.connect();
    try {
      // Check if user exists
      const existing = await client.query('SELECT user_id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (existing.rowCount && existing.rowCount > 0) {
        const err: any = new Error('An account with this email address already exists.');
        err.statusCode = 409;
        throw err;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      const insertRes = await client.query(`
        INSERT INTO users (user_id, name, email, password_hash, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING user_id AS "userId", name, email, created_at AS "createdAt";
      `, [userId, name.trim(), cleanEmail, passwordHash]);

      const user = insertRes.rows[0];
      const token = this.generateToken(user);
      return { token, user };
    } finally {
      client.release();
    }
  }

  // Login with email and password
  static async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    if (!email || !password) {
      const err: any = new Error('Email and password are required');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = email.trim().toLowerCase();
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT user_id AS "userId", name, email, password_hash, created_at AS "createdAt"
        FROM users
        WHERE LOWER(email) = $1;
      `, [cleanEmail]);

      if (result.rowCount === 0) {
        const err: any = new Error('Invalid email or password.');
        err.statusCode = 401;
        throw err;
      }

      const userRow = result.rows[0];
      if (!userRow.password_hash) {
        const err: any = new Error('This account was created via Google Sign-In. Please sign in with Google.');
        err.statusCode = 400;
        throw err;
      }

      const isMatch = await bcrypt.compare(password, userRow.password_hash);
      if (!isMatch) {
        const err: any = new Error('Invalid email or password.');
        err.statusCode = 401;
        throw err;
      }

      const user: UserProfile = {
        userId: userRow.userId,
        name: userRow.name,
        email: userRow.email,
        createdAt: userRow.createdAt,
      };

      const token = this.generateToken(user);
      return { token, user };
    } finally {
      client.release();
    }
  }

  // Sync / Upsert Google / Firebase user into database
  static async syncFirebaseUser(uid: string, email: string, name: string): Promise<{ token: string; user: UserProfile }> {
    const client = await pool.connect();
    try {
      const cleanEmail = email.trim().toLowerCase();
      const userName = name || cleanEmail.split('@')[0] || 'Driver';

      const upsertRes = await client.query(`
        INSERT INTO users (user_id, name, email, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (email)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING user_id AS "userId", name, email, created_at AS "createdAt";
      `, [uid, userName, cleanEmail]);

      const user = upsertRes.rows[0];
      const token = this.generateToken(user);
      return { token, user };
    } finally {
      client.release();
    }
  }

  // Get User Profile by ID
  static async getUserById(userId: string): Promise<UserProfile | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT user_id AS "userId", name, email, created_at AS "createdAt"
        FROM users
        WHERE user_id = $1;
      `, [userId]);

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}
