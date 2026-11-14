import React from 'react';
import {
  LayoutDashboard,
  Search,
  BookmarkCheck,
  History,
  User,
  FlaskConical,
  LogOut,
  Car,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeReservationsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  activeReservationsCount,
}) => {
  const { user, logout, openAuthModal } = useAuth();
  const { isConnected } = useSocket();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'find-parking', label: 'Find Parking', icon: Search },
    {
      id: 'my-reservations',
      label: 'My Reservations',
      icon: BookmarkCheck,
      badge: activeReservationsCount > 0 ? activeReservationsCount : undefined,
    },
    { id: 'parking-history', label: 'Parking History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'testing-lab', label: 'Testing & ACID Lab', icon: FlaskConical },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-none">
                Smart Parking
              </h1>
              <span className="text-[11px] text-slate-400 font-medium">Real-Time Finder</span>
            </div>
          </div>

          {/* Real-Time WebSocket Indicator */}
          <div className="mt-4 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="text-slate-300 text-[11px] font-medium">
                {isConnected ? 'Socket.IO Live' : 'Connecting...'}
              </span>
            </div>
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white text-indigo-700' : 'bg-amber-500 text-slate-950 font-black'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Card & Logout Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0 border border-white/20">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center justify-center gap-2 border border-slate-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            <p className="text-xs text-slate-400 text-center">
              Sign in to reserve slots & track cars
            </p>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
