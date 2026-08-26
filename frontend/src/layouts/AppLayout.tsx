import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, PlusCircle, CheckSquare, RefreshCcw,
  Users, User, Building2, Tag, BarChart3, Bell, Shield, Settings,
  LogOut, Menu, ChevronDown, Building
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  roles?: string[];
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4.5 h-4.5" />, to: '/dashboard' },
  { label: 'Expenses', icon: <Receipt className="w-4.5 h-4.5" />, to: '/expenses' },
  { label: 'Add Expense', icon: <PlusCircle className="w-4.5 h-4.5" />, to: '/expenses/new' },
  { label: 'Approvals', icon: <CheckSquare className="w-4.5 h-4.5" />, to: '/approvals', roles: ['super_admin','admin'] },
  { label: 'Reimbursements', icon: <RefreshCcw className="w-4.5 h-4.5" />, to: '/reimbursements' },
  { label: 'Directors', icon: <User className="w-4.5 h-4.5" />, to: '/directors', roles: ['super_admin','admin'] },
  { label: 'Employees', icon: <Users className="w-4.5 h-4.5" />, to: '/employees', roles: ['super_admin','admin'] },
  { label: 'Departments', icon: <Building2 className="w-4.5 h-4.5" />, to: '/departments', roles: ['super_admin','admin'] },
  { label: 'Categories', icon: <Tag className="w-4.5 h-4.5" />, to: '/categories', roles: ['super_admin','admin'] },
  { label: 'Reports', icon: <BarChart3 className="w-4.5 h-4.5" />, to: '/reports' },
  { label: 'Notifications', icon: <Bell className="w-4.5 h-4.5" />, to: '/notifications' },
  { label: 'Audit Logs', icon: <Shield className="w-4.5 h-4.5" />, to: '/audit', roles: ['super_admin','admin'] },
  { label: 'User Management', icon: <Users className="w-4.5 h-4.5" />, to: '/users', roles: ['super_admin','admin'] },
  { label: 'Company', icon: <Building className="w-4.5 h-4.5" />, to: '/company', roles: ['super_admin'] },
  { label: 'Settings', icon: <Settings className="w-4.5 h-4.5" />, to: '/settings' },
];

const AppLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userRole = user?.role?.name || 'employee';

  const visibleNav = navItems.filter(item =>
    !item.roles || item.roles.includes(userRole)
  );

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    director: 'bg-amber-100 text-amber-700',
    employee: 'bg-green-100 text-green-700'
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Expense</p>
            <p className="text-blue-400 text-xs font-medium">Manager</p>
          </div>
        </Link>
      </div>

      {/* Company name */}
      {user?.company && (
        <div className="px-5 py-3 border-b border-slate-700/50">
          <p className="text-slate-400 text-xs truncate">{user.company.name}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-slate-700/50 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${roleColors[userRole] || 'bg-slate-700 text-slate-300'}`}>
              {user?.role?.displayName}
            </span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div className="mobile-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 z-50 flex flex-col shadow-2xl lg:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-4 lg:px-6 h-16 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-slate-800 font-semibold text-sm">Welcome back, {user?.name?.split(' ')[0]}! 👋</p>
              <p className="text-slate-400 text-xs">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500">
              <Bell className="w-5 h-5" />
            </Link>
            <Link to="/expenses/new" className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <PlusCircle className="w-4 h-4" />
              Add Expense
            </Link>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0)}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-700">{user?.name}</p>
                    <p className="text-xs text-slate-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
