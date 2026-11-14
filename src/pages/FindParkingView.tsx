import React, { useState, useMemo } from 'react';
import { ParkingLot, ParkingSlot } from '../types.ts';
import { SlotCard } from '../components/SlotCard.tsx';
import {
  Search,
  MapPin,
  Clock,
  Zap,
  Car,
  Filter,
  Layers,
  ChevronRight,
  Shield,
  Sparkles,
} from 'lucide-react';

interface FindParkingViewProps {
  lots: ParkingLot[];
  selectedLotId: string;
  setSelectedLotId: (id: string) => void;
  slots: ParkingSlot[];
  onReserveSlot: (slotId: string) => void;
  isReserving: boolean;
}

export const FindParkingView: React.FC<FindParkingViewProps> = ({
  lots,
  selectedLotId,
  setSelectedLotId,
  slots,
  onReserveSlot,
  isReserving,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

  const selectedLot = lots.find((l) => l.lotId === selectedLotId) || lots[0];

  // Distinct floors for selected lot
  const floors = useMemo(() => {
    const set = new Set(slots.map((s) => s.floor));
    return ['ALL', ...Array.from(set)];
  }, [slots]);

  // Filter lots by search query
  const filteredLots = useMemo(() => {
    if (!searchQuery.trim()) return lots;
    const q = searchQuery.toLowerCase();
    return lots.filter(
      (l) => l.lotName.toLowerCase().includes(q) || l.location.toLowerCase().includes(q)
    );
  }, [lots, searchQuery]);

  // Filter slots by floor, status, vehicle
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (selectedFloor !== 'ALL' && slot.floor !== selectedFloor) return false;
      if (statusFilter !== 'ALL' && slot.status !== statusFilter) return false;
      if (vehicleFilter !== 'ALL' && slot.vehicleType !== vehicleFilter) return false;
      return true;
    });
  }, [slots, selectedFloor, statusFilter, vehicleFilter]);

  const evSlotsCount = useMemo(() => slots.filter((s) => s.isEvCharging).length, [slots]);

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Find & Reserve Parking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse city lots, check live bay status, and hold your parking space in seconds.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lot by location or name..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lot Directory */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Parking Facilities ({filteredLots.length})
            </h2>
            <span className="text-xs text-slate-400">Live Availability</span>
          </div>

          <div className="space-y-3">
            {filteredLots.map((lot) => {
              const isSelected = lot.lotId === selectedLotId;
              return (
                <div
                  key={lot.lotId}
                  onClick={() => setSelectedLotId(lot.lotId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-600/10 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{lot.lotName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{lot.location}</span>
                      </p>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      ${lot.hourlyRate}/h
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600">
                        {lot.availableCount} free
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500">{lot.totalSlots} total</span>
                    </div>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      {lot.operatingHours}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Facility Details & Slot Grid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Selected Facility Overview Card */}
          {selectedLot && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">{selectedLot.lotName}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                      Open Now
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{selectedLot.location}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="text-right">
                    <p className="text-slate-400">Rate</p>
                    <p className="font-bold text-slate-900 text-sm">${selectedLot.hourlyRate} / hour</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">EV Stations</p>
                    <p className="font-bold text-emerald-600 text-sm flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      {evSlotsCount} Ports
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Floor filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    Floor:
                  </span>
                  {floors.map((fl) => (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => setSelectedFloor(fl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        selectedFloor === fl
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {fl}
                    </button>
                  ))}
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-1.5">
                  {(['ALL', 'AVAILABLE', 'RESERVED', 'OCCUPIED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        statusFilter === st
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Slots Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Parking Slots ({filteredSlots.length})
              </span>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Reserved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Occupied
                </span>
              </div>
            </div>

            {filteredSlots.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No parking slots found</p>
                <p className="text-xs text-slate-400 mt-1">Try switching floor or status filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredSlots.map((slot) => (
                  <SlotCard
                    key={slot.slotId}
                    slot={slot}
                    lotName={selectedLot?.lotName}
                    onReserve={onReserveSlot}
                    isReserving={isReserving}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
