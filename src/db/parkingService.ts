import { pool } from './index.ts';

export interface LotWithStats {
  lotId: string;
  lotName: string;
  location: string;
  totalSlots: number;
  hourlyRate: number;
  operatingHours: string;
  imageUrl?: string | null;
  availableCount: number;
  occupiedCount: number;
  reservedCount: number;
}

export interface SlotRecord {
  slotId: string;
  lotId: string;
  slotNumber: string;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED';
  vehicleType: string;
  floor: string;
  isEvCharging: boolean;
}

export interface ReservationRecord {
  reservationId: string;
  userId: string;
  slotId: string;
  slotNumber?: string;
  lotId?: string;
  lotName?: string;
  location?: string;
  bookingTime: string;
  expiryTime: string;
  checkInTime?: string | null;
  cancellationTime?: string | null;
  status: 'ACTIVE' | 'CHECKED_IN' | 'CANCELLED' | 'EXPIRED';
  remainingSeconds?: number;
  canCancel?: boolean;
  cancelRemainingSeconds?: number;
}

export class ParkingService {
  // 1. Get Dashboard High-Level Stats
  static async getDashboardStats() {
    const client = await pool.connect();
    try {
      const statsRes = await client.query(`
        SELECT
          COUNT(*)::int AS total_slots,
          COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available_slots,
          COUNT(*) FILTER (WHERE status = 'OCCUPIED')::int AS occupied_slots,
          COUNT(*) FILTER (WHERE status = 'RESERVED')::int AS reserved_slots
        FROM parking_slots;
      `);

      const activeResCount = await client.query(`
        SELECT COUNT(*)::int AS active_reservations
        FROM reservations
        WHERE status = 'ACTIVE' AND expiry_time > NOW();
      `);

      return {
        totalSlots: statsRes.rows[0]?.total_slots || 0,
        availableSlots: statsRes.rows[0]?.available_slots || 0,
        occupiedSlots: statsRes.rows[0]?.occupied_slots || 0,
        reservedSlots: statsRes.rows[0]?.reserved_slots || 0,
        activeReservations: activeResCount.rows[0]?.active_reservations || 0,
      };
    } finally {
      client.release();
    }
  }

  // 2. Get All Parking Lots with slot status breakdown
  static async getAllLots(): Promise<LotWithStats[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT
          pl.lot_id AS "lotId",
          pl.lot_name AS "lotName",
          pl.location,
          pl.total_slots AS "totalSlots",
          pl.hourly_rate AS "hourlyRate",
          pl.operating_hours AS "operatingHours",
          pl.image_url AS "imageUrl",
          COALESCE(COUNT(ps.slot_id) FILTER (WHERE ps.status = 'AVAILABLE'), 0)::int AS "availableCount",
          COALESCE(COUNT(ps.slot_id) FILTER (WHERE ps.status = 'OCCUPIED'), 0)::int AS "occupiedCount",
          COALESCE(COUNT(ps.slot_id) FILTER (WHERE ps.status = 'RESERVED'), 0)::int AS "reservedCount"
        FROM parking_lots pl
        LEFT JOIN parking_slots ps ON pl.lot_id = ps.lot_id
        GROUP BY pl.lot_id
        ORDER BY pl.lot_name ASC;
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // 3. Get Slots for a Specific Lot
  static async getSlotsForLot(lotId: string): Promise<SlotRecord[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT
          slot_id AS "slotId",
          lot_id AS "lotId",
          slot_number AS "slotNumber",
          status,
          vehicle_type AS "vehicleType",
          floor,
          is_ev_charging AS "isEvCharging"
        FROM parking_slots
        WHERE lot_id = $1
        ORDER BY floor ASC, slot_number ASC;
      `, [lotId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // 4. Reserve Slot with ACID Transaction and Row-Level Locking (SELECT FOR UPDATE)
  static async reserveSlot(userId: string, slotId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Rule: Check active reservation count for the user (Max 2 active reservations allowed)
      const activeRes = await client.query(`
        SELECT reservation_id
        FROM reservations
        WHERE user_id = $1 AND status = 'ACTIVE' AND expiry_time > NOW()
        FOR UPDATE;
      `, [userId]);

      const activeCount = activeRes.rowCount || 0;
      if (activeCount >= 2) {
        await client.query('ROLLBACK');
        const err: any = new Error('Reservation limit reached: Drivers can have a maximum of 2 active reservations at a time.');
        err.statusCode = 400;
        throw err;
      }

      // Rule: Lock and verify slot availability with SELECT FOR UPDATE to prevent double-booking
      const slotQuery = await client.query(`
        SELECT slot_id, lot_id, slot_number, status, vehicle_type, floor, is_ev_charging
        FROM parking_slots
        WHERE slot_id = $1
        FOR UPDATE;
      `, [slotId]);

      if (slotQuery.rowCount === 0) {
        await client.query('ROLLBACK');
        const err: any = new Error('Parking slot not found.');
        err.statusCode = 404;
        throw err;
      }

      const currentSlot = slotQuery.rows[0];
      if (currentSlot.status !== 'AVAILABLE') {
        await client.query('ROLLBACK');
        const err: any = new Error(`Slot ${currentSlot.slot_number} is no longer available (current status: ${currentSlot.status}).`);
        err.statusCode = 409;
        throw err;
      }

      // Generate unique Reservation ID
      const reservationId = `RES-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const bookingTime = new Date();
      // 15-minute countdown expiry
      const expiryTime = new Date(bookingTime.getTime() + 15 * 60 * 1000);

      // Create reservation
      await client.query(`
        INSERT INTO reservations (reservation_id, user_id, slot_id, booking_time, expiry_time, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE');
      `, [reservationId, userId, slotId, bookingTime, expiryTime]);

      // Update slot status to RESERVED
      await client.query(`
        UPDATE parking_slots
        SET status = 'RESERVED'
        WHERE slot_id = $1;
      `, [slotId]);

      await client.query('COMMIT');

      // Fetch lot information for the confirmation response
      const lotInfo = await client.query(`
        SELECT lot_name, location FROM parking_lots WHERE lot_id = $1;
      `, [currentSlot.lot_id]);

      const confirmedSlot: SlotRecord = {
        slotId: currentSlot.slot_id,
        lotId: currentSlot.lot_id,
        slotNumber: currentSlot.slot_number,
        status: 'RESERVED',
        vehicleType: currentSlot.vehicle_type,
        floor: currentSlot.floor,
        isEvCharging: currentSlot.is_ev_charging,
      };

      const reservation: ReservationRecord = {
        reservationId,
        userId,
        slotId,
        slotNumber: currentSlot.slot_number,
        lotId: currentSlot.lot_id,
        lotName: lotInfo.rows[0]?.lot_name || '',
        location: lotInfo.rows[0]?.location || '',
        bookingTime: bookingTime.toISOString(),
        expiryTime: expiryTime.toISOString(),
        status: 'ACTIVE',
        remainingSeconds: 15 * 60,
        canCancel: true,
        cancelRemainingSeconds: 5 * 60,
      };

      return { reservation, updatedSlot: confirmedSlot };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  // 5. Check-In to a Reservation
  static async checkInReservation(userId: string, reservationId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resQuery = await client.query(`
        SELECT r.reservation_id, r.user_id, r.slot_id, r.status, r.expiry_time, ps.slot_number, ps.lot_id
        FROM reservations r
        JOIN parking_slots ps ON r.slot_id = ps.slot_id
        WHERE r.reservation_id = $1 AND r.user_id = $2
        FOR UPDATE;
      `, [reservationId, userId]);

      if (resQuery.rowCount === 0) {
        await client.query('ROLLBACK');
        const err: any = new Error('Reservation not found or unauthorized.');
        err.statusCode = 404;
        throw err;
      }

      const resRow = resQuery.rows[0];
      if (resRow.status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        const err: any = new Error(`Cannot check in: Reservation is already ${resRow.status.toLowerCase()}.`);
        err.statusCode = 400;
        throw err;
      }

      if (new Date(resRow.expiry_time).getTime() <= Date.now()) {
        await client.query('ROLLBACK');
        const err: any = new Error('Cannot check in: 15-minute check-in window has expired.');
        err.statusCode = 400;
        throw err;
      }

      const now = new Date();
      // Update reservation to CHECKED_IN
      await client.query(`
        UPDATE reservations
        SET status = 'CHECKED_IN', check_in_time = $1
        WHERE reservation_id = $2;
      `, [now, reservationId]);

      // Update slot to OCCUPIED
      await client.query(`
        UPDATE parking_slots
        SET status = 'OCCUPIED'
        WHERE slot_id = $1;
      `, [resRow.slot_id]);

      await client.query('COMMIT');

      // Return updated slot details
      const slotQuery = await client.query(`
        SELECT slot_id AS "slotId", lot_id AS "lotId", slot_number AS "slotNumber", status, vehicle_type AS "vehicleType", floor, is_ev_charging AS "isEvCharging"
        FROM parking_slots WHERE slot_id = $1;
      `, [resRow.slot_id]);

      return {
        reservationId,
        status: 'CHECKED_IN',
        checkInTime: now.toISOString(),
        updatedSlot: slotQuery.rows[0],
      };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  // 6. Cancel a Reservation (Within 5-minute rule)
  static async cancelReservation(userId: string, reservationId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resQuery = await client.query(`
        SELECT r.reservation_id, r.user_id, r.slot_id, r.status, r.booking_time, ps.slot_number
        FROM reservations r
        JOIN parking_slots ps ON r.slot_id = ps.slot_id
        WHERE r.reservation_id = $1 AND r.user_id = $2
        FOR UPDATE;
      `, [reservationId, userId]);

      if (resQuery.rowCount === 0) {
        await client.query('ROLLBACK');
        const err: any = new Error('Reservation not found or unauthorized.');
        err.statusCode = 404;
        throw err;
      }

      const resRow = resQuery.rows[0];
      if (resRow.status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        const err: any = new Error(`Cannot cancel: Reservation is already ${resRow.status.toLowerCase()}.`);
        err.statusCode = 400;
        throw err;
      }

      // Check 5-minute cancellation policy
      const bookingTimeMs = new Date(resRow.booking_time).getTime();
      const elapsedMinutes = (Date.now() - bookingTimeMs) / (1000 * 60);

      if (elapsedMinutes > 5) {
        await client.query('ROLLBACK');
        const err: any = new Error('Cancellation policy violation: Reservations can only be cancelled within the first 5 minutes of booking.');
        err.statusCode = 400;
        throw err;
      }

      const now = new Date();
      // Update reservation to CANCELLED
      await client.query(`
        UPDATE reservations
        SET status = 'CANCELLED', cancellation_time = $1
        WHERE reservation_id = $2;
      `, [now, reservationId]);

      // Release slot back to AVAILABLE
      await client.query(`
        UPDATE parking_slots
        SET status = 'AVAILABLE'
        WHERE slot_id = $1;
      `, [resRow.slot_id]);

      await client.query('COMMIT');

      const slotQuery = await client.query(`
        SELECT slot_id AS "slotId", lot_id AS "lotId", slot_number AS "slotNumber", status, vehicle_type AS "vehicleType", floor, is_ev_charging AS "isEvCharging"
        FROM parking_slots WHERE slot_id = $1;
      `, [resRow.slot_id]);

      return {
        reservationId,
        status: 'CANCELLED',
        cancellationTime: now.toISOString(),
        updatedSlot: slotQuery.rows[0],
      };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  // 7. Background Worker: Automatically Expire Overdue Active Reservations (> 15 minutes)
  static async expireOverdueReservations(): Promise<{ expiredReservations: any[]; freedSlots: SlotRecord[] }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Select active reservations whose expiry_time <= NOW()
      const overdueRes = await client.query(`
        SELECT r.reservation_id, r.slot_id, r.user_id, ps.slot_number, ps.lot_id
        FROM reservations r
        JOIN parking_slots ps ON r.slot_id = ps.slot_id
        WHERE r.status = 'ACTIVE' AND r.expiry_time <= NOW()
        FOR UPDATE SKIP LOCKED;
      `);

      if (overdueRes.rowCount === 0) {
        await client.query('COMMIT');
        return { expiredReservations: [], freedSlots: [] };
      }

      const expiredIds = overdueRes.rows.map(r => r.reservation_id);
      const slotIds = overdueRes.rows.map(r => r.slot_id);

      // Mark reservations as EXPIRED
      await client.query(`
        UPDATE reservations
        SET status = 'EXPIRED'
        WHERE reservation_id = ANY($1::text[]);
      `, [expiredIds]);

      // Free corresponding slots back to AVAILABLE (if they are currently RESERVED)
      await client.query(`
        UPDATE parking_slots
        SET status = 'AVAILABLE'
        WHERE slot_id = ANY($1::text[]) AND status = 'RESERVED';
      `, [slotIds]);

      // Get updated slot records
      const freedSlotsRes = await client.query(`
        SELECT slot_id AS "slotId", lot_id AS "lotId", slot_number AS "slotNumber", status, vehicle_type AS "vehicleType", floor, is_ev_charging AS "isEvCharging"
        FROM parking_slots
        WHERE slot_id = ANY($1::text[]);
      `, [slotIds]);

      await client.query('COMMIT');

      return {
        expiredReservations: overdueRes.rows,
        freedSlots: freedSlotsRes.rows,
      };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      console.error('Error during auto-expiry check:', err);
      return { expiredReservations: [], freedSlots: [] };
    } finally {
      client.release();
    }
  }

  // 8. Get User's Reservations (Active, Past, History)
  static async getUserReservations(userId: string): Promise<ReservationRecord[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT
          r.reservation_id AS "reservationId",
          r.user_id AS "userId",
          r.slot_id AS "slotId",
          ps.slot_number AS "slotNumber",
          pl.lot_id AS "lotId",
          pl.lot_name AS "lotName",
          pl.location,
          r.booking_time AS "bookingTime",
          r.expiry_time AS "expiryTime",
          r.check_in_time AS "checkInTime",
          r.cancellation_time AS "cancellationTime",
          r.status
        FROM reservations r
        JOIN parking_slots ps ON r.slot_id = ps.slot_id
        JOIN parking_lots pl ON ps.lot_id = pl.lot_id
        WHERE r.user_id = $1
        ORDER BY r.booking_time DESC;
      `, [userId]);

      const now = Date.now();
      return result.rows.map((row) => {
        const expiryMs = new Date(row.expiryTime).getTime();
        const bookingMs = new Date(row.bookingTime).getTime();
        const remainingSeconds = Math.max(0, Math.floor((expiryMs - now) / 1000));
        const cancelElapsedSeconds = Math.floor((now - bookingMs) / 1000);
        const cancelRemainingSeconds = Math.max(0, 300 - cancelElapsedSeconds);
        const canCancel = row.status === 'ACTIVE' && cancelRemainingSeconds > 0;

        return {
          ...row,
          bookingTime: new Date(row.bookingTime).toISOString(),
          expiryTime: new Date(row.expiryTime).toISOString(),
          checkInTime: row.checkInTime ? new Date(row.checkInTime).toISOString() : null,
          cancellationTime: row.cancellationTime ? new Date(row.cancellationTime).toISOString() : null,
          remainingSeconds,
          canCancel,
          cancelRemainingSeconds,
        };
      });
    } finally {
      client.release();
    }
  }

  // 9. Admin / Physical Sensor Simulator: Toggle a slot status directly
  static async toggleSlotStatus(slotId: string, newStatus: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updateRes = await client.query(`
        UPDATE parking_slots
        SET status = $1
        WHERE slot_id = $2
        RETURNING slot_id AS "slotId", lot_id AS "lotId", slot_number AS "slotNumber", status, vehicle_type AS "vehicleType", floor, is_ev_charging AS "isEvCharging";
      `, [newStatus, slotId]);

      if (updateRes.rowCount === 0) {
        await client.query('ROLLBACK');
        throw new Error('Slot not found');
      }

      await client.query('COMMIT');
      return updateRes.rows[0] as SlotRecord;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }
}
