import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';
import { Reservation } from '../types.ts';
import { Bell, Clock, Menu, ShieldCheck, User } from 'lucide-react';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  activeReservation?: Reservation | null;
  onNavigateToReservations: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileSidebar,
  activeReservation,
  onNavigateToReservations,
}) => {
  const { user, openAuthModal } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
            PostgreSQL ACID Database
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Live Sync &lt;2s
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Reservation Banner Button */}
        {activeReservation && (
          <button
            type="button"
            onClick={onNavigateToReservations}
            className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors animate-pulse"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Active Hold: Slot {activeReservation.slotNumber || activeReservation.slotId}</span>
          </button>
        )}

        {/* User Account / Sign In */}
        {user ? (
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border border-indigo-700 shadow-xs">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="py-1.5 px-3.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
