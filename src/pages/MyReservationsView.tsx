import React from 'react';
import { Reservation } from '../types.ts';
import { ReservationCountdown } from '../components/ReservationCountdown.tsx';
import { BookmarkCheck, AlertCircle, ShieldCheck, ArrowRight, Car, Info } from 'lucide-react';

interface MyReservationsViewProps {
  reservations: Reservation[];
  onCheckIn: (reservationId: string) => Promise<void>;
  onCancel: (reservationId: string) => Promise<void>;
  isProcessing: boolean;
  onNavigateToFindParking: () => void;
}

export const MyReservationsView: React.FC<MyReservationsViewProps> = ({
  reservations,
  onCheckIn,
  onCancel,
  isProcessing,
  onNavigateToFindParking,
}) => {
  const activeReservations = reservations.filter((r) => r.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Driver Active Holds</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            My Active Reservations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Keep track of your held slots, countdown limits, and proceed with gate check-in.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Active: <strong className="text-indigo-600">{activeReservations.length}</strong> / 2 max
          </span>
        </div>
      </div>

      {/* Rules & Policy Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 space-y-1">
          <p className="font-bold">Reservation Policy Guidelines</p>
          <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
            <li><strong>15-Minute Expiry:</strong> Slots are held for 15 minutes. If check-in is not confirmed, the system auto-releases the slot.</li>
            <li><strong>5-Minute Cancellation:</strong> You can cancel your reservation freely within the first 5 minutes. After 5 minutes, cancellation is locked.</li>
            <li><strong>Max 2 Holds:</strong> Each driver can hold at most 2 active parking slots at any given time.</li>
          </ul>
        </div>
      </div>

      {/* Active Reservations List */}
      {activeReservations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Car className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Active Reservations</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You do not have any pending parking slot holds right now. Find an available slot in our lots to reserve.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToFindParking}
            className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <span>Explore Parking Lots</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeReservations.map((res) => (
            <ReservationCountdown
              key={res.reservationId}
              reservation={res}
              onCheckIn={onCheckIn}
              onCancel={onCancel}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      )}
    </div>
  );
};
