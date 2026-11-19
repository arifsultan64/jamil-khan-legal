import React, { useState } from 'react';
import { Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  DatabaseBackup,
  ExternalLink,
  FilePlus2,
  Files,
  FolderKanban,
  HardDrive,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserCheck,
  X,
} from 'lucide-react';
import { usePortal } from '../contexts/PortalAuthContext';
import { FallbackImage } from '../components/common/FallbackImage';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authReady, isAdmin, adminChecked, profile, logout } = usePortal();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  if (!authReady || !adminChecked) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#0F2342] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Verifying Administrator Session</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/editor', label: 'Publish Content', icon: FilePlus2 },
    { to: '/admin/publications', label: 'All Publications', icon: Files },
    { to: '/admin/categories', label: 'Categories', icon: FolderKanban },
    { to: '/admin/media', label: 'Google Drive & Media', icon: HardDrive },
    { to: '/admin/profile', label: 'Author Profile', icon: UserCheck },
    { to: '/admin/inbox', label: 'Inbox & Subscribers', icon: Inbox },
    { to: '/admin/analytics', label: 'Analytics & Logs', icon: BarChart3 },
    { to: '/admin/backup', label: 'Backup & Recovery', icon: DatabaseBackup },
    { to: '/admin/settings', label: 'Site Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <header className="lg:hidden bg-[#0F2342] text-white px-4 h-14 flex items-center justify-between sticky top-0 z-40">
        <Link to="/admin/dashboard" className="font-serif text-xl font-bold whitespace-nowrap">
          Jameel Khan CMS
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/" className="text-xs text-slate-200 hover:text-white px-2 py-1">
            Public Site
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded border border-white/20 cursor-pointer"
            aria-label="Toggle admin menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'fixed inset-y-0 left-0 z-50 w-72 block' : 'hidden'
        } lg:block lg:w-64 lg:shrink-0 bg-[#0F2342] text-slate-200 flex flex-col border-r border-[#18345E]`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-serif text-xl font-bold text-white leading-tight">Jameel Khan</p>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#B38D47]">Admin Console</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-300"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#18345E] text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/admin/profile"
              className="w-10 h-10 rounded-full overflow-hidden border border-white/25 bg-[#18345E] shrink-0"
              title="Edit Author & Profile Picture"
            >
              <FallbackImage
                src={profile.profileImageUrl || '/assets/aistudio/jameel-khan_2505a7a3.jpg'}
                alt={profile.fullName || 'Jameel Khan'}
                className="w-full h-full object-cover object-top"
              />
            </Link>
            <div className="min-w-0 truncate text-slate-300">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400">Authorized Admin</span>
              <span className="font-medium text-white truncate block">{user.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded border border-white/20 text-slate-200 hover:bg-white/10"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Portal
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-red-900/50 text-red-100 hover:bg-red-800/70 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {children}
      </div>
    </div>
  );
};
