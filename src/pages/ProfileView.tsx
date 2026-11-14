import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Reservation } from '../types.ts';
import { User, Mail, Hash, Calendar, ShieldCheck, LogOut, BookmarkCheck, CheckCircle2 } from 'lucide-react';

interface ProfileViewProps {
  reservations: Reservation[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({ reservations }) => {
  const { user, logout, openAuthModal } = useAuth();

  if (!user) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto space-y-4 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Driver Account Required</h2>
          <p className="text-xs text-slate-500 mt-1">
            Please log in or create an account to view your profile and manage reserved slots.
          </p>
        </div>
        <button
          onClick={() => openAuthModal('login')}
          className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  const activeCount = reservations.filter((r) => r.status === 'ACTIVE').length;
  const checkedInCount = reservations.filter((r) => r.status === 'CHECKED_IN').length;
  const totalBookings = reservations.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center border-2 border-white shadow-md">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">{user.name}</h1>
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Driver
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="py-2 px-4 rounded-xl border border-slate-200 hover:border-rose-300 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Driver Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Holds</span>
            <BookmarkCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-2">{activeCount} / 2</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Maximum 2 concurrent slots</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Checked In</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-2">{checkedInCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Completed parking sessions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bookings</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-2">{totalBookings}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All-time reservations</p>
        </div>
      </div>

      {/* Account Details Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Account Credentials & Database Record
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-medium block">Unique User ID (Database Primary Key)</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-1 block truncate">
              {user.userId}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-medium block">Account Email Address</span>
            <span className="font-bold text-slate-800 text-sm mt-1 block truncate">
              {user.email}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-medium block">Security Protocol</span>
            <span className="font-bold text-emerald-700 text-sm mt-1 block">
              ACID Transaction Isolation & JWT Auth
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-medium block">Data Access Scope</span>
            <span className="font-bold text-slate-800 text-sm mt-1 block">
              Private User Reservations Only
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
