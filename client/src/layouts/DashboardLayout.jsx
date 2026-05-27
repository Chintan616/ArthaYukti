import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { TrendingUp, BarChart2, Eye, Briefcase, Activity, LogOut, ChevronDown } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import toast from 'react-hot-toast';
import useSocket from '../hooks/useSocket';

const NAV_LINKS = [
  { to: '/dashboard/market',    label: 'Market',      icon: BarChart2 },
  { to: '/dashboard/watchlist', label: 'Watchlists & Alerts', icon: Eye       },
  { to: '/dashboard/portfolio', label: 'Portfolio',           icon: Briefcase },
  { to: '/dashboard/stocks',    label: 'Stocks',      icon: Activity  },
];

const DashboardLayout = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const user      = useSelector((s) => s.auth.user);
  const balance   = useSelector((s) => s.portfolio.virtualBalance);
  const [menuOpen, setMenuOpen] = useState(false);

  // Connect Socket.IO once at layout level — all child pages share live data
  useSocket();

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Signed out');
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>

      {/* ─── Top Nav ─────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 h-16 flex items-center px-6 md:px-8 gap-6"
        style={{
          backgroundColor: 'oklch(0.16 0.012 250 / 0.88)',
          backdropFilter:  'blur(14px)',
          borderBottom:    '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <NavLink to="/dashboard/market" className="flex items-center gap-2 flex-shrink-0 mr-2">
          <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
            <TrendingUp className="h-4 w-4 stroke-[1.5]" style={{ color: 'var(--primary-foreground)' }} />
          </div>
          <span className="font-display text-lg hidden sm:block" style={{ color: 'var(--foreground)' }}>
            ArthaYukti
          </span>
        </NavLink>

        {/* Primary Nav */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="h-9 px-3 flex items-center gap-1.5 rounded-md text-sm transition-colors duration-150"
              style={({ isActive }) => ({
                color:           isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                backgroundColor: isActive ? 'oklch(0.78 0.16 152 / 0.1)' : 'transparent',
              })}
            >
              <Icon className="h-4 w-4 stroke-[1.5]" />
              <span className="hidden md:block">{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Right — balance + user menu */}
        <div className="ml-auto flex items-center gap-4">
          {/* Paper balance chip */}
          <div
            className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-md border"
            style={{ borderColor: 'oklch(0.78 0.16 152 / 0.3)', backgroundColor: 'oklch(0.78 0.16 152 / 0.06)' }}
          >
            <span className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--muted-foreground)' }}>
              Balance
            </span>
            <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--primary)' }}>
              ₹{balance?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '1,00,000'}
            </span>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="h-9 px-2.5 flex items-center gap-2 rounded-md text-sm transition-colors duration-150"
              style={{ color: 'var(--foreground)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.15)', color: 'var(--primary)' }}
              >
                {initials}
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 stroke-[1.5] transition-transform duration-150"
                style={{ color: 'var(--muted-foreground)', transform: menuOpen ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-11 w-52 rounded-lg border py-1 z-50"
                  style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', boxShadow: '0 8px 32px -8px oklch(0 0 0 / 0.5)' }}
                >
                  <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{user?.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full h-9 px-3 flex items-center gap-2.5 text-sm mt-1 transition-colors duration-150"
                    style={{ color: 'var(--destructive)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'oklch(0.66 0.22 22 / 0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LogOut className="h-4 w-4 stroke-[1.5]" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Page Content ─── */}
      <main className="flex-1 w-full px-6 md:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
