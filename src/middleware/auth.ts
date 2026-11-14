import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminAuth } from '../lib/firebase-admin.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-parking-secret-jwt-key-2026';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token is missing' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // 1. Try decoding as JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    if (decoded && decoded.userId) {
      req.user = decoded;
      return next();
    }
  } catch (jwtErr) {
    // If not standard JWT, attempt Firebase ID token verification
  }

  // 2. Try Firebase Admin ID Token
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      userId: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Driver'),
    };
    return next();
  } catch (firebaseErr) {
    console.error('Token verification error:', firebaseErr);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};
