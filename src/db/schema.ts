import { pgTable, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  userId: text('user_id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Parking Lots Table
export const parkingLots = pgTable('parking_lots', {
  lotId: text('lot_id').primaryKey(),
  lotName: text('lot_name').notNull(),
  location: text('location').notNull(),
  totalSlots: integer('total_slots').notNull(),
  hourlyRate: integer('hourly_rate').default(5).notNull(),
  operatingHours: text('operating_hours').default('24/7').notNull(),
  imageUrl: text('image_url'),
});

// Parking Slots Table
export const parkingSlots = pgTable('parking_slots', {
  slotId: text('slot_id').primaryKey(),
  lotId: text('lot_id').references(() => parkingLots.lotId, { onDelete: 'cascade' }).notNull(),
  slotNumber: text('slot_number').notNull(),
  status: text('status').notNull().default('AVAILABLE'), // 'AVAILABLE', 'RESERVED', 'OCCUPIED'
  vehicleType: text('vehicle_type').notNull().default('Sedan'), // 'Compact', 'Sedan', 'SUV', 'EV'
  floor: text('floor').default('Level 1').notNull(),
  isEvCharging: boolean('is_ev_charging').default(false).notNull(),
}, (table) => [
  index('idx_slots_lot_id').on(table.lotId),
  index('idx_slots_status').on(table.status),
]);

// Reservations Table
export const reservations = pgTable('reservations', {
  reservationId: text('reservation_id').primaryKey(),
  userId: text('user_id').references(() => users.userId, { onDelete: 'cascade' }).notNull(),
  slotId: text('slot_id').references(() => parkingSlots.slotId, { onDelete: 'cascade' }).notNull(),
  bookingTime: timestamp('booking_time', { withTimezone: true }).defaultNow().notNull(),
  expiryTime: timestamp('expiry_time', { withTimezone: true }).notNull(),
  checkInTime: timestamp('check_in_time', { withTimezone: true }),
  cancellationTime: timestamp('cancellation_time', { withTimezone: true }),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'CHECKED_IN', 'CANCELLED', 'EXPIRED'
}, (table) => [
  index('idx_res_user_id').on(table.userId),
  index('idx_res_slot_id').on(table.slotId),
  index('idx_res_status').on(table.status),
]);

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations),
}));

export const parkingLotsRelations = relations(parkingLots, ({ many }) => ({
  slots: many(parkingSlots),
}));

export const parkingSlotsRelations = relations(parkingSlots, ({ one, many }) => ({
  lot: one(parkingLots, {
    fields: [parkingSlots.lotId],
    references: [parkingLots.lotId],
  }),
  reservations: many(reservations),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.userId],
  }),
  slot: one(parkingSlots, {
    fields: [reservations.slotId],
    references: [parkingSlots.slotId],
  }),
}));
