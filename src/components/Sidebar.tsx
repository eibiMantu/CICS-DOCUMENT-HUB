import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Library, Users, LogOut, User as UserIcon, Eye } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export default function Sidebar() {
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
    <aside className="w-64 bg-[#0A0A0A] border-r border-white/5 flex flex-col h-screen sticky top-0 shrink-0 hidden md:flex">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">CICS DocHub</span>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold ml-11">
          {profile?.role?.replace('-', ' ') || 'Student'}
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/' || item.to === '/admin'}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
              isActive 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-[#151619] border border-white/5 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {profile?.name || 'User'}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                {profile?.email}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
