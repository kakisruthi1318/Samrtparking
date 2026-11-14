import React, { useState, useMemo } from 'react';
import { Reservation, ReservationStatus } from '../types.ts';
import { History, CheckCircle2, XCircle, Clock, AlertTriangle, Calendar, MapPin, Search } from 'lucide-react';

interface ParkingHistoryViewProps {
  reservations: Reservation[];
}

export const ParkingHistoryView: React.FC<ParkingHistoryViewProps> = ({ reservations }) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const slotMatch = (r.slotNumber || r.slotId).toLowerCase().includes(q);
        const lotMatch = (r.lotName || '').toLowerCase().includes(q);
        const idMatch = r.reservationId.toLowerCase().includes(q);
        if (!slotMatch && !lotMatch && !idMatch) return false;
      }
      return true;
    });
  }, [reservations, statusFilter, searchQuery]);

  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-300">
            <Clock className="w-3 h-3" />
            Active Hold
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Checked In
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full border border-rose-300">
            <AlertTriangle className="w-3 h-3" />
            Expired (15m)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>Audit Trail</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Parking History & Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete database records of your past reservations, check-ins, and expirations.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search slot, lot, or ID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {['ALL', 'ACTIVE', 'CHECKED_IN', 'CANCELLED', 'EXPIRED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL'
              ? `All Records (${reservations.length})`
              : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* History Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredReservations.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No matching reservations found</p>
            <p className="text-xs text-slate-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Reservation ID</th>
                  <th className="py-3.5 px-4">Slot</th>
                  <th className="py-3.5 px-4">Parking Facility</th>
                  <th className="py-3.5 px-4">Booking Time</th>
                  <th className="py-3.5 px-4">Check-in / Resolution</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredReservations.map((res) => {
                  const bookingDate = new Date(res.bookingTime);
                  return (
                    <tr key={res.reservationId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                        {res.reservationId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {res.slotNumber || res.slotId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{res.lotName || 'City Lot'}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{res.location}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-600">
                          <p>{bookingDate.toLocaleDateString()}</p>
                          <p className="text-[11px] text-slate-400">{bookingDate.toLocaleTimeString()}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {res.checkInTime ? (
                          <div className="text-emerald-700 font-medium">
                            <p>Checked in at</p>
                            <p className="text-[11px] text-emerald-600 font-mono">
                              {new Date(res.checkInTime).toLocaleTimeString()}
                            </p>
                          </div>
                        ) : res.cancellationTime ? (
                          <div className="text-slate-500 font-medium">
                            <p>Cancelled at</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {new Date(res.cancellationTime).toLocaleTimeString()}
                            </p>
                          </div>
                        ) : res.status === 'EXPIRED' ? (
                          <div className="text-rose-600 font-medium">
                            <p>Expired at 15m</p>
                            <p className="text-[11px] text-rose-500 font-mono">
                              {new Date(res.expiryTime).toLocaleTimeString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium">Pending arrival</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {getStatusBadge(res.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
