import React, { useState, useEffect } from 'react';
import { Reservation } from '../types.ts';
import { Clock, CheckCircle, XCircle, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';

interface ReservationCountdownProps {
  reservation: Reservation;
  onCheckIn: (reservationId: string) => Promise<void>;
  onCancel: (reservationId: string) => Promise<void>;
  isProcessing?: boolean;
}

export const ReservationCountdown: React.FC<ReservationCountdownProps> = ({
  reservation,
  onCheckIn,
  onCancel,
  isProcessing = false,
}) => {
  const [remainingSec, setRemainingSec] = useState<number>(() => {
    const expiry = new Date(reservation.expiryTime).getTime();
    return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
  });

  const [cancelRemainingSec, setCancelRemainingSec] = useState<number>(() => {
    const booking = new Date(reservation.bookingTime).getTime();
    const deadline = booking + 5 * 60 * 1000;
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const expiry = new Date(reservation.expiryTime).getTime();
      const currentRemaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setRemainingSec(currentRemaining);

      const booking = new Date(reservation.bookingTime).getTime();
      const deadline = booking + 5 * 60 * 1000;
      const currentCancelRemaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setCancelRemainingSec(currentCancelRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation.expiryTime, reservation.bookingTime]);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isExpired = remainingSec <= 0 && reservation.status === 'ACTIVE';
  const canCancel = cancelRemainingSec > 0 && reservation.status === 'ACTIVE';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-slate-800">
                Slot {reservation.slotNumber || reservation.slotId}
              </span>
              <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                Active Hold
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Reservation ID: {reservation.reservationId}
            </p>
          </div>
        </div>

        {reservation.lotName && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-medium">{reservation.lotName}</span>
          </div>
        )}
      </div>

      {/* Countdown Displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 15-Minute Check-In Timer */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
            remainingSec < 120
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Check-In Countdown
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Auto-expires if check-in is not confirmed
            </p>
          </div>
          <div className="text-right">
            <div
              className={`font-mono text-2xl font-black ${
                remainingSec < 120 ? 'text-rose-600 animate-pulse' : 'text-amber-600'
              }`}
            >
              {formatTimer(remainingSec)}
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {isExpired ? 'Expired' : 'Remaining'}
            </span>
          </div>
        </div>

        {/* 5-Minute Cancellation Policy Timer */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Cancellation Window
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              5-minute cancellation window policy
            </p>
          </div>
          <div className="text-right">
            <div
              className={`font-mono text-xl font-bold ${
                canCancel ? 'text-slate-700' : 'text-slate-400'
              }`}
            >
              {canCancel ? formatTimer(cancelRemainingSec) : 'Window Closed'}
            </div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">
              {canCancel ? 'Free Cancel' : 'Non-refundable'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => onCancel(reservation.reservationId)}
          disabled={!canCancel || isProcessing}
          title={
            !canCancel
              ? 'Cancellations are only allowed within the first 5 minutes of booking.'
              : 'Cancel this reservation and free the slot'
          }
          className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            canCancel
              ? 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 cursor-pointer shadow-2xs'
              : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel Reservation</span>
        </button>

        <button
          type="button"
          onClick={() => onCheckIn(reservation.reservationId)}
          disabled={isExpired || isProcessing}
          className="py-2.5 px-5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Check In (Arrived at Slot)</span>
        </button>
      </div>
    </div>
  );
};
