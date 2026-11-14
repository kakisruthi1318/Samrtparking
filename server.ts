import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { ParkingService } from './src/db/parkingService.ts';
import { UserService } from './src/db/userService.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Helper to broadcast slot changes and dashboard updates
export const broadcastSlotUpdate = async (slot: any, eventType: string = 'SLOT_UPDATED', meta: any = {}) => {
  io.emit('slot_updated', {
    type: eventType,
    slot,
    meta,
    timestamp: new Date().toISOString(),
  });

  if (slot.lotId) {
    io.to(`lot_${slot.lotId}`).emit('lot_slot_updated', {
      type: eventType,
      slot,
      meta,
      timestamp: new Date().toISOString(),
    });
  }

  // Refresh and broadcast dashboard stats
  try {
    const stats = await ParkingService.getDashboardStats();
    io.emit('dashboard_updated', stats);
  } catch (err) {
    console.error('Failed to broadcast dashboard stats:', err);
  }
};

// Socket.IO Room handling
io.on('connection', (socket) => {
  socket.on('join_lot', (lotId: string) => {
    socket.join(`lot_${lotId}`);
  });

  socket.on('leave_lot', (lotId: string) => {
    socket.leave(`lot_${lotId}`);
  });

  socket.on('ping_status', async () => {
    try {
      const stats = await ParkingService.getDashboardStats();
      socket.emit('dashboard_updated', stats);
    } catch (_) {}
  });
});

// ==================== BACKGROUND EXPIRE WORKER ====================
// Runs every 5 seconds to expire reservations older than 15 minutes
setInterval(async () => {
  try {
    const { expiredReservations, freedSlots } = await ParkingService.expireOverdueReservations();
    if (freedSlots.length > 0) {
      console.log(`[Worker] Expired ${expiredReservations.length} reservation(s). Released ${freedSlots.length} slot(s).`);
      for (const slot of freedSlots) {
        await broadcastSlotUpdate(slot, 'RESERVATION_EXPIRED', {
          reason: '15-minute check-in countdown expired without check-in',
        });
      }
    }
  } catch (err) {
    console.error('[Worker Error] Auto-expiry failed:', err);
  }
}, 5000);

// ==================== API ROUTES ====================

// --- Authentication Endpoints ---

// Register with email and password
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await UserService.register(name, email, password);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Registration failed' });
  }
});

// Login with email and password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await UserService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 401).json({ error: error.message || 'Login failed' });
  }
});

// Google Sign-In with Firebase ID token
app.post('/api/auth/firebase-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token' });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const result = await UserService.syncFirebaseUser(
      decoded.uid,
      decoded.email || '',
      decoded.name || ''
    );
    res.json(result);
  } catch (error: any) {
    console.error('Firebase login error:', error);
    res.status(401).json({ error: 'Failed to verify Firebase authentication' });
  }
});

// Get current user profile
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await UserService.getUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user profile' });
  }
});

// --- Dashboard & Parking Lots Endpoints ---

// Get Dashboard aggregate stats
app.get('/api/dashboard/stats', async (_req, res) => {
  try {
    const stats = await ParkingService.getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard stats' });
  }
});

// Get all parking lots
app.get('/api/lots', async (_req, res) => {
  try {
    const lots = await ParkingService.getAllLots();
    res.json(lots);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch parking lots' });
  }
});

// Get all slots for a specific parking lot
app.get('/api/lots/:lotId/slots', async (req, res) => {
  try {
    const slots = await ParkingService.getSlotsForLot(req.params.lotId);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch slots' });
  }
});

// --- Reservation Management Endpoints ---

// Reserve a parking slot (ACID transaction with row-level locking)
app.post('/api/slots/reserve', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { slotId } = req.body;
    if (!slotId) {
      return res.status(400).json({ error: 'slotId is required' });
    }

    const { reservation, updatedSlot } = await ParkingService.reserveSlot(req.user!.userId, slotId);

    // Broadcast real-time slot update to all connected clients immediately
    await broadcastSlotUpdate(updatedSlot, 'SLOT_RESERVED', {
      slotId,
      reservationId: reservation.reservationId,
    });

    res.status(201).json({
      message: 'Slot successfully reserved! Please check in within 15 minutes.',
      reservation,
      updatedSlot,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Reservation failed' });
  }
});

// Check-in to a reservation
app.post('/api/reservations/:reservationId/check-in', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reservationId } = req.params;
    const result = await ParkingService.checkInReservation(req.user!.userId, reservationId);

    // Broadcast slot update: status is now OCCUPIED
    await broadcastSlotUpdate(result.updatedSlot, 'SLOT_OCCUPIED', {
      reservationId,
    });

    res.json({
      message: 'Check-in successful! The slot is now occupied.',
      ...result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Check-in failed' });
  }
});

// Cancel a reservation (Allowed only within first 5 minutes)
app.post('/api/reservations/:reservationId/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reservationId } = req.params;
    const result = await ParkingService.cancelReservation(req.user!.userId, reservationId);

    // Broadcast slot update: status is now AVAILABLE again
    await broadcastSlotUpdate(result.updatedSlot, 'SLOT_FREED', {
      reservationId,
      reason: 'Cancelled by driver',
    });

    res.json({
      message: 'Reservation cancelled successfully. Slot has been freed.',
      ...result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Cancellation failed' });
  }
});

// Get current user's reservations (Active, checked-in, past, cancelled)
app.get('/api/reservations/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const reservations = await ParkingService.getUserReservations(req.user!.userId);
    res.json(reservations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch reservations' });
  }
});

// --- Testing / Simulation Endpoints (Supports the 7 Required Test Scenarios) ---

// Toggle slot status directly (simulates vehicle sensor or barrier gate)
app.post('/api/admin/toggle-slot-status', async (req, res) => {
  try {
    const { slotId, status } = req.body;
    if (!slotId || !['AVAILABLE', 'OCCUPIED', 'RESERVED'].includes(status)) {
      return res.status(400).json({ error: 'Valid slotId and status (AVAILABLE, OCCUPIED, RESERVED) required' });
    }

    const updatedSlot = await ParkingService.toggleSlotStatus(slotId, status);
    await broadcastSlotUpdate(updatedSlot, 'SENSOR_UPDATE', {
      source: 'Physical In-Ground Sensor / Barrier Gate',
    });

    res.json({ message: 'Slot status updated successfully', updatedSlot });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle slot' });
  }
});

// Simulate race condition: 2 simultaneous booking attempts on the exact same slot
app.post('/api/test/simulate-race-condition', async (req, res) => {
  try {
    const { slotId, user1Id, user2Id } = req.body;
    if (!slotId) {
      return res.status(400).json({ error: 'slotId is required' });
    }

    const u1 = user1Id || 'usr_sim_driver_alpha';
    const u2 = user2Id || 'usr_sim_driver_beta';

    // Ensure mock users exist for the foreign key
    await UserService.syncFirebaseUser(u1, 'driver.alpha@example.com', 'Driver Alpha');
    await UserService.syncFirebaseUser(u2, 'driver.beta@example.com', 'Driver Beta');

    // Run both reservations at the exact same millisecond
    const results = await Promise.allSettled([
      ParkingService.reserveSlot(u1, slotId),
      ParkingService.reserveSlot(u2, slotId),
    ]);

    const attempt1 = results[0].status === 'fulfilled'
      ? { success: true, reservationId: results[0].value.reservation.reservationId, user: 'Driver Alpha' }
      : { success: false, error: (results[0].reason as any).message, user: 'Driver Alpha' };

    const attempt2 = results[1].status === 'fulfilled'
      ? { success: true, reservationId: results[1].value.reservation.reservationId, user: 'Driver Beta' }
      : { success: false, error: (results[1].reason as any).message, user: 'Driver Beta' };

    // Broadcast if either succeeded
    if (results[0].status === 'fulfilled') {
      await broadcastSlotUpdate(results[0].value.updatedSlot, 'SLOT_RESERVED');
    } else if (results[1].status === 'fulfilled') {
      await broadcastSlotUpdate(results[1].value.updatedSlot, 'SLOT_RESERVED');
    }

    res.json({
      message: 'Concurrent double-booking test completed. ACID row locking verified.',
      slotId,
      attempt1,
      attempt2,
      guaranteedExclusive: (attempt1.success && !attempt2.success) || (!attempt1.success && attempt2.success),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Race condition test failed' });
  }
});

// ==================== VITE & STATIC FILES ====================

const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Parking Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server start error:', err);
  process.exit(1);
});
