import React, { useState, useMemo } from 'react';
import { DashboardStats, ParkingLot, ParkingSlot, Reservation } from '../types.ts';
import { SlotCard } from '../components/SlotCard.tsx';
import {
  Car,
  CheckCircle2,
  Clock,
  AlertOctagon,
  BookmarkCheck,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';

interface DashboardViewProps {
  stats: DashboardStats | null;
  lots: ParkingLot[];
  selectedLotId: string;
  setSelectedLotId: (id: string) => void;
  slots: ParkingSlot[];
  onReserveSlot: (slotId: string) => void;
  isReserving: boolean;
  onNavigateToFindParking: () => void;
  onNavigateToReservations: () => void;
  activeReservation?: Reservation | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  lots,
  selectedLotId,
  setSelectedLotId,
  slots,
  onReserveSlot,
  isReserving,
  onNavigateToFindParking,
  onNavigateToReservations,
  activeReservation,
}) => {
  const [searchLocation, setSearchLocation] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

  // Filter lots based on location search
  const filteredLots = useMemo(() => {
    if (!searchLocation.trim()) return lots;
    const q = searchLocation.toLowerCase();
    return lots.filter(
      (l) => l.lotName.toLowerCase().includes(q) || l.location.toLowerCase().includes(q)
    );
  }, [lots, searchLocation]);

  // Current selected lot
  const currentLot = lots.find((l) => l.lotId === selectedLotId) || lots[0];

  // Filter slots for current lot based on availability and vehicle type
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (statusFilter !== 'ALL' && slot.status !== statusFilter) return false;
      if (vehicleFilter !== 'ALL' && slot.vehicleType !== vehicleFilter) return false;
      return true;
    });
  }, [slots, statusFilter, vehicleFilter]);

  return (
    <div className="space-y-6">
      {/* Welcome & System Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Smart Urban Mobility System</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Real-Time Parking Management Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live slot availability, ACID-guaranteed reservations, and automated 15-minute expiry workflow.
          </p>
        </div>

        {activeReservation && (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-center justify-between gap-4 max-w-sm">
            <div>
              <p className="text-xs font-bold text-amber-900">You have an active reservation</p>
              <p className="text-xs text-amber-700">Slot {activeReservation.slotNumber} is on hold for you</p>
            </div>
            <button
              onClick={onNavigateToReservations}
              className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
            >
              View Timer
            </button>
          </div>
        )}
      </div>

      {/* 5 High-Level Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {/* Total Slots */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Slots</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {stats?.totalSlots ?? slots.length}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Across all facilities</span>
          </div>
        </div>

        {/* Available Slots (Green) */}
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Available</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              {stats?.availableSlots ?? 0}
            </span>
            <span className="text-xs text-emerald-600 block mt-0.5">Ready for booking</span>
          </div>
        </div>

        {/* Occupied Slots (Red) */}
        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Occupied</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-700 font-mono">
              {stats?.occupiedSlots ?? 0}
            </span>
            <span className="text-xs text-rose-600 block mt-0.5">Vehicle parked</span>
          </div>
        </div>

        {/* Reserved Slots (Yellow) */}
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Reserved</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-700 font-mono">
              {stats?.reservedSlots ?? 0}
            </span>
            <span className="text-xs text-amber-600 block mt-0.5">15m hold active</span>
          </div>
        </div>

        {/* Active Reservations */}
        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 shadow-2xs flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Active Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookmarkCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-indigo-700 font-mono">
              {stats?.activeReservations ?? 0}
            </span>
            <span className="text-xs text-indigo-600 block mt-0.5">Pending check-in</span>
          </div>
        </div>
      </div>

      {/* Facility Quick Selector & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Select Parking Facility</h2>
            <p className="text-xs text-slate-500">Pick a location to view live bay status</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Search by lot name or address..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Lot Cards Carousel / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredLots.map((lot) => {
            const isSelected = lot.lotId === selectedLotId;
            const occupancyPct = lot.totalSlots
              ? Math.round(((lot.occupiedCount + lot.reservedCount) / lot.totalSlots) * 100)
              : 0;

            return (
              <button
                key={lot.lotId}
                type="button"
                onClick={() => setSelectedLotId(lot.lotId)}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-600/10'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{lot.lotName}</h3>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                    ${lot.hourlyRate}/hr
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{lot.location}</p>

                {/* Occupancy bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                    <span className="text-emerald-700 font-bold">{lot.availableCount} available</span>
                    <span className="text-slate-400">{lot.totalSlots} total</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${Math.round((lot.availableCount / (lot.totalSlots || 1)) * 100)}%` }}
                    />
                    <div
                      className="bg-amber-400 h-full transition-all duration-300"
                      style={{ width: `${Math.round((lot.reservedCount / (lot.totalSlots || 1)) * 100)}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all duration-300"
                      style={{ width: `${Math.round((lot.occupiedCount / (lot.totalSlots || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Slots Visualization Header & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {currentLot?.lotName || 'Parking Slots'}
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {filteredSlots.length} Slots Shown
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live status synchronized in real time with PostgreSQL transactions
            </p>
          </div>

          {/* Color Legend matching requirements */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-2xs" />
              <span className="font-semibold text-slate-700">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500 shadow-2xs" />
              <span className="font-semibold text-slate-700">Reserved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500 shadow-2xs" />
              <span className="font-semibold text-slate-700">Occupied</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Status:
            </span>
            {(['ALL', 'AVAILABLE', 'RESERVED', 'OCCUPIED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Slots' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Vehicle:</span>
            {['ALL', 'Sedan', 'SUV', 'Compact', 'EV'].map((veh) => (
              <button
                key={veh}
                type="button"
                onClick={() => setVehicleFilter(veh)}
                className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  vehicleFilter === veh
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {veh === 'ALL' ? 'All Types' : veh}
              </button>
            ))}
          </div>
        </div>

        {/* Slots Grid */}
        {filteredSlots.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No slots match your filters</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the status or vehicle type filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {filteredSlots.map((slot) => (
              <SlotCard
                key={slot.slotId}
                slot={slot}
                lotName={currentLot?.lotName}
                onReserve={onReserveSlot}
                isReserving={isReserving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
