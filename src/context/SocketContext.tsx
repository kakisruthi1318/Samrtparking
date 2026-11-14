import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ParkingSlot, DashboardStats } from '../types.ts';

interface SlotUpdateEvent {
  type: string;
  slot: ParkingSlot;
  meta?: any;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastSlotUpdate: SlotUpdateEvent | null;
  dashboardStats: DashboardStats | null;
  joinLotRoom: (lotId: string) => void;
  leaveLotRoom: (lotId: string) => void;
  requestFreshStats: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastSlotUpdate, setLastSlotUpdate] = useState<SlotUpdateEvent | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('ping_status');
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('slot_updated', (event: SlotUpdateEvent) => {
      setLastSlotUpdate(event);
    });

    s.on('dashboard_updated', (stats: DashboardStats) => {
      setDashboardStats(stats);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const joinLotRoom = (lotId: string) => {
    if (socket && isConnected) {
      socket.emit('join_lot', lotId);
    }
  };

  const leaveLotRoom = (lotId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_lot', lotId);
    }
  };

  const requestFreshStats = () => {
    if (socket && isConnected) {
      socket.emit('ping_status');
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        lastSlotUpdate,
        dashboardStats,
        joinLotRoom,
        leaveLotRoom,
        requestFreshStats,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
