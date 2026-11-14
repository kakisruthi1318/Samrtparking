import React from 'react';
import { ParkingSlot } from '../types.ts';
import { Zap, Car, ShieldCheck, Clock, CheckCircle2, AlertOctagon } from 'lucide-react';

interface SlotCardProps {
  slot: ParkingSlot;
  lotName?: string;
  onReserve: (slotId: string) => void;
  isReserving?: boolean;
  disabledReason?: string | null;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  lotName,
  onReserve,
  isReserving = false,
  disabledReason = null,
}) => {
  const isAvailable = slot.status === 'AVAILABLE';
  const isReserved = slot.status === 'RESERVED';
  const isOccupied = slot.status === 'OCCUPIED';

  // Status-based color themes matching requirement:
  // GREEN = Available, RED = Occupied, YELLOW = Reserved
  const getTheme = () => {
    switch (slot.status) {
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-50/60',
          border: 'border-emerald-300 hover:border-emerald-500',
          headerBg: 'bg-emerald-100/70',
          badgeBg: 'bg-emerald-600 text-white',
          textColor: 'text-emerald-900',
          accent: 'emerald',
          statusLabel: 'Available',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'RESERVED':
        return {
          bg: 'bg-amber-50/60',
          border: 'border-amber-300',
          headerBg: 'bg-amber-100/70',
          badgeBg: 'bg-amber-500 text-white',
          textColor: 'text-amber-900',
          accent: 'amber',
          statusLabel: 'Reserved',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'OCCUPIED':
      default:
        return {
          bg: 'bg-rose-50/60',
          border: 'border-rose-200',
          headerBg: 'bg-rose-100/70',
          badgeBg: 'bg-rose-600 text-white',
          textColor: 'text-rose-900',
          accent: 'rose',
          statusLabel: 'Occupied',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />,
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`relative rounded-xl border ${theme.border} ${theme.bg} shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between`}
    >
      {/* Top Bar with Slot ID and Status Badge */}
      <div className={`px-3.5 py-2.5 ${theme.headerBg} flex items-center justify-between border-b border-black/5`}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold text-slate-800 tracking-tight">
            {slot.slotNumber}
          </span>
          <span className="text-[11px] font-medium text-slate-500 bg-white/80 px-1.5 py-0.5 rounded-md border border-slate-200">
            {slot.floor}
          </span>
        </div>

        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${theme.badgeBg} shadow-xs`}>
          {theme.icon}
          <span>{theme.statusLabel}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 space-y-2.5 flex-1">
        {lotName && (
          <p className="text-xs text-slate-500 truncate font-medium">
            📍 {lotName}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Vehicle Type Badge */}
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-white text-slate-700 px-2 py-1 rounded-md border border-slate-200 shadow-2xs">
            <Car className="w-3 h-3 text-slate-400" />
            {slot.vehicleType}
          </span>

          {/* EV Charging Badge */}
          {slot.isEvCharging && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md border border-emerald-300">
              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-500" />
              EV Plug
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Slot ID: <span className="font-semibold text-slate-600">{slot.slotId}</span>
        </div>
      </div>

      {/* Footer / Reserve Button */}
      <div className="p-3 bg-white/80 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onReserve(slot.slotId)}
          disabled={!isAvailable || isReserving}
          title={
            !isAvailable
              ? `Slot is currently ${slot.status.toLowerCase()}`
              : disabledReason || 'Reserve this slot'
          }
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
            isAvailable
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/20 cursor-pointer'
              : isReserved
              ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-80'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80'
          }`}
        >
          {isReserving ? (
            <span className="inline-flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Reserving...
            </span>
          ) : isAvailable ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Reserve Slot</span>
            </>
          ) : isReserved ? (
            <>
              <Clock className="w-3.5 h-3.5" />
              <span>Reserved</span>
            </>
          ) : (
            <>
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Occupied</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
