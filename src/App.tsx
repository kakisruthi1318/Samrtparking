import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SocketProvider, useSocket } from './context/SocketContext.tsx';
import { DashboardStats, ParkingLot, ParkingSlot, Reservation } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { DashboardView } from './pages/DashboardView.tsx';
import { FindParkingView } from './pages/FindParkingView.tsx';
import { MyReservationsView } from './pages/MyReservationsView.tsx';
import { ParkingHistoryView } from './pages/ParkingHistoryView.tsx';
import { ProfileView } from './pages/ProfileView.tsx';
import { TestingLabView } from './pages/TestingLabView.tsx';
import { CheckCircle2, Clock, MapPin, X, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

function SmartParkingApp() {
  const { user, token, openAuthModal } = useAuth();
  const { lastSlotUpdate, joinLotRoom, leaveLotRoom, dashboardStats: liveStats } = useSocket();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [isReserving, setIsReserving] = useState<boolean>(false);
  const [isProcessingRes, setIsProcessingRes] = useState<boolean>(false);
  const [confirmationModal, setConfirmationModal] = useState<{
    reservation: Reservation;
    slot: ParkingSlot;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // 1. Fetch initial Parking Lots & Dashboard Stats
  const fetchLots = useCallback(async () => {
    try {
      const res = await fetch('/api/lots');
      if (res.ok) {
        const data = await res.json();
        setLots(data);
        if (data.length > 0 && !selectedLotId) {
          setSelectedLotId(data[0].lotId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch lots:', err);
    }
  }, [selectedLotId]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // 2. Fetch Slots for selected parking lot
  const fetchSlots = useCallback(async (lotId: string) => {
    if (!lotId) return;
    try {
      const res = await fetch(`/api/lots/${lotId}/slots`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch (err) {
      console.error('Failed to fetch slots:', err);
    }
  }, []);

  // 3. Fetch User Reservations
  const fetchMyReservations = useCallback(async () => {
    if (!token) {
      setReservations([]);
      return;
    }
    try {
      const res = await fetch('/api/reservations/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchLots();
    fetchStats();
  }, [fetchLots, fetchStats]);

  // Fetch slots whenever selectedLotId changes
  useEffect(() => {
    if (selectedLotId) {
      fetchSlots(selectedLotId);
      joinLotRoom(selectedLotId);
      return () => {
        leaveLotRoom(selectedLotId);
      };
    }
  }, [selectedLotId, fetchSlots, joinLotRoom, leaveLotRoom]);

  // Fetch user reservations whenever token/auth state changes
  useEffect(() => {
    fetchMyReservations();
  }, [fetchMyReservations]);

  // Sync real-time stats from Socket.IO
  useEffect(() => {
    if (liveStats) {
      setStats(liveStats);
    }
  }, [liveStats]);

  // Handle Real-Time Slot Updates from Socket.IO without refreshing the page!
  useEffect(() => {
    if (!lastSlotUpdate) return;

    const { slot, type, meta } = lastSlotUpdate;

    // 1. Update current slots list if slot belongs to the selected lot
    setSlots((prevSlots) =>
      prevSlots.map((s) => (s.slotId === slot.slotId ? { ...s, status: slot.status } : s))
    );

    // 2. Update lots aggregate counts
    setLots((prevLots) =>
      prevLots.map((l) => {
        if (l.lotId === slot.lotId) {
          // Re-trigger lots refresh or compute
          fetchLots();
        }
        return l;
      })
    );

    // 3. Refresh user reservations if this was an expiry or cancellation event
    if (token && (type === 'RESERVATION_EXPIRED' || type === 'SLOT_FREED')) {
      fetchMyReservations();
    }

    // 4. Subtle notification toast for real-time awareness
    if (type === 'RESERVATION_EXPIRED') {
      showToast(`Slot ${slot.slotNumber || slot.slotId} reservation expired and is now available!`, 'info');
    } else if (type === 'SLOT_RESERVED') {
      showToast(`Slot ${slot.slotNumber || slot.slotId} was just reserved in real-time.`, 'info');
    }
  }, [lastSlotUpdate, token, fetchLots, fetchMyReservations]);

  // Reserve a Slot Handler
  const handleReserveSlot = async (slotId: string) => {
    if (!token || !user) {
      openAuthModal('login');
      return;
    }

    setIsReserving(true);
    try {
      const res = await fetch('/api/slots/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slotId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reserve slot');
      }

      // Confetti celebration
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (_) {}

      setConfirmationModal({
        reservation: data.reservation,
        slot: data.updatedSlot,
      });

      // Update slots and user reservations immediately
      setSlots((prev) =>
        prev.map((s) => (s.slotId === slotId ? { ...s, status: 'RESERVED' } : s))
      );
      await fetchMyReservations();
      await fetchStats();
      showToast('Parking slot successfully reserved! 15-minute countdown started.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Slot is no longer available.', 'error');
    } finally {
      setIsReserving(false);
    }
  };

  // Check-In Handler
  const handleCheckIn = async (reservationId: string) => {
    if (!token) return;
    setIsProcessingRes(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/check-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Check-in failed');
      }

      // Confetti celebration
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.5 },
        });
      } catch (_) {}

      await fetchMyReservations();
      await fetchLots();
      await fetchStats();
      showToast('Checked in successfully! Slot is marked occupied.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Check-in failed', 'error');
    } finally {
      setIsProcessingRes(false);
    }
  };

  // Cancel Handler
  const handleCancelReservation = async (reservationId: string) => {
    if (!token) return;
    setIsProcessingRes(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cancellation failed');
      }

      await fetchMyReservations();
      await fetchLots();
      await fetchStats();
      showToast('Reservation cancelled. The parking slot has been released.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel reservation', 'error');
    } finally {
      setIsProcessingRes(false);
    }
  };

  const activeReservations = reservations.filter((r) => r.status === 'ACTIVE');
  const firstActiveReservation = activeReservations[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`py-3 px-4 rounded-xl shadow-lg border flex items-center gap-3 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toastMessage.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop & Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:static md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            setCurrentTab(tab);
            setMobileSidebarOpen(false);
          }}
          activeReservationsCount={activeReservations.length}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          activeReservation={firstActiveReservation}
          onNavigateToReservations={() => setCurrentTab('my-reservations')}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              lots={lots}
              selectedLotId={selectedLotId}
              setSelectedLotId={setSelectedLotId}
              slots={slots}
              onReserveSlot={handleReserveSlot}
              isReserving={isReserving}
              onNavigateToFindParking={() => setCurrentTab('find-parking')}
              onNavigateToReservations={() => setCurrentTab('my-reservations')}
              activeReservation={firstActiveReservation}
            />
          )}

          {currentTab === 'find-parking' && (
            <FindParkingView
              lots={lots}
              selectedLotId={selectedLotId}
              setSelectedLotId={setSelectedLotId}
              slots={slots}
              onReserveSlot={handleReserveSlot}
              isReserving={isReserving}
            />
          )}

          {currentTab === 'my-reservations' && (
            <MyReservationsView
              reservations={reservations}
              onCheckIn={handleCheckIn}
              onCancel={handleCancelReservation}
              isProcessing={isProcessingRes}
              onNavigateToFindParking={() => setCurrentTab('find-parking')}
            />
          )}

          {currentTab === 'parking-history' && (
            <ParkingHistoryView reservations={reservations} />
          )}

          {currentTab === 'profile' && (
            <ProfileView reservations={reservations} />
          )}

          {currentTab === 'testing-lab' && (
            <TestingLabView
              slots={slots}
              lots={lots}
              onRefreshData={async () => {
                await fetchLots();
                await fetchSlots(selectedLotId);
                await fetchStats();
                await fetchMyReservations();
              }}
            />
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal />

      {/* Reservation Confirmation Modal */}
      {confirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 text-center relative">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 border border-white/30 shadow-inner">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-black">Slot Reserved Successfully!</h2>
              <p className="text-xs text-emerald-100 mt-1">
                Your parking bay is held and guaranteed in the database.
              </p>
              <button
                type="button"
                onClick={() => setConfirmationModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-semibold text-slate-500">Reserved Slot</span>
                  <span className="font-mono text-base font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-300">
                    {confirmationModal.slot.slotNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs">
                  <span className="text-slate-500">Facility</span>
                  <span className="font-bold text-slate-800">{confirmationModal.reservation.lotName || 'Downtown Lot'}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs">
                  <span className="text-slate-500">Vehicle Type</span>
                  <span className="font-bold text-slate-800">{confirmationModal.slot.vehicleType}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Reservation ID</span>
                  <span className="font-mono font-bold text-indigo-700">{confirmationModal.reservation.reservationId}</span>
                </div>
              </div>

              {/* Countdown Warning */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">15-Minute Check-In Timer Started</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Please arrive and tap <strong>Check In</strong> in your dashboard within 15 minutes, or the slot will automatically be released for other drivers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationModal(null);
                    setCurrentTab('my-reservations');
                  }}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <span>Go to My Reservations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SmartParkingApp />
      </SocketProvider>
    </AuthProvider>
  );
}
