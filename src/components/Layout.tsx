import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Library, Users, LogOut, User as UserIcon, Eye } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { profile, logout } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner-admin';

  const navItems = isAdmin ? [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/', icon: Eye, label: 'Student View' },
  ] : [
    { to: '/', icon: Library, label: 'Library' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-50 w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">CICS DocHub</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-xl"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="md:hidden fixed inset-0 z-40 bg-[#0A0A0A] pt-24 px-6 flex flex-col"
          >
            <nav className="space-y-3 flex-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/' || item.to === '/admin'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-4 px-6 py-5 rounded-2xl transition-all",
                    isActive 
                      ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-6 h-6" />
                  <span className="font-bold text-lg">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            
            <div className="pb-12 space-y-4">
              <div className="bg-[#151619] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{profile?.displayName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{profile?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-all font-bold"
              >
                <LogOut className="w-6 h-6" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-12 overflow-y-auto w-full max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
