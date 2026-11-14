export type SlotStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED';
export type VehicleType = 'Sedan' | 'Compact' | 'SUV' | 'EV';
export type ReservationStatus = 'ACTIVE' | 'CHECKED_IN' | 'CANCELLED' | 'EXPIRED';

export interface User {
  userId: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface ParkingLot {
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

export interface ParkingSlot {
  slotId: string;
  lotId: string;
  slotNumber: string;
  status: SlotStatus;
  vehicleType: VehicleType;
  floor: string;
  isEvCharging: boolean;
}

export interface Reservation {
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
  status: ReservationStatus;
  remainingSeconds?: number;
  canCancel?: boolean;
  cancelRemainingSeconds?: number;
}

export interface DashboardStats {
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  activeReservations: number;
}
