import { useState } from 'react';
import {
  TrendingUp,
  BarChart2,
  Briefcase,
  Eye,
  Activity,
  LogOut,
  User,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATS = [
  {
    label: 'Portfolio Value',
    value: '₹0.00',
    sub: '+0.00%  today',
    up: null,
  },
  {
    label: "Today's P&L",
    value: '₹0.00',
    sub: 'No open positions',
    up: null,
  },
  {
    label: 'Paper Balance',
    value: '₹1,00,000',
    sub: 'Virtual funds',
    up: true,
  },
  {
    label: 'Open Positions',
    value: '0',
    sub: 'No trades yet',
    up: null,
  },
];

const FEATURES = [
  {
    icon: BarChart2,
    title: 'Market Dashboard',
    description: 'Live prices, trending stocks, top gainers & losers across indices.',
    status: 'Phase 1 — Coming next',
  },
  {
    icon: Briefcase,
    title: 'Portfolio',
    description: 'Track holdings, P&L, sector allocation, and performance metrics.',
    status: 'Phase 1 — Coming next',
  },
  {
    icon: Eye,
    title: 'Watchlist',
    description: 'Build and manage personalised stock watchlists with real-time updates.',
    status: 'Phase 1 — Coming next',
  },
  {
    icon: Activity,
    title: 'Paper Trading',
    description: 'Simulate buy/sell orders with virtual balance — zero risk, real experience.',
    status: 'Phase 1 — Coming next',
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Trader';
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>

      {/* ─── Top Nav ─── */}
      <nav
        className="sticky top-0 z-50 h-16 flex items-center px-6 md:px-8"
        style={{
          backgroundColor: 'oklch(0.16 0.012 250 / 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <TrendingUp className="h-4 w-4 stroke-[1.5]" style={{ color: 'var(--primary-foreground)' }} />
          </div>
          <span className="font-display text-lg" style={{ color: 'var(--foreground)' }}>
            Artha<span className="font-sans font-medium text-primary">युक्ति</span>
          </span>
        </div>

        {/* Nav links — disabled until Phase 1 features land */}
        <div className="hidden md:flex items-center gap-1 ml-10">
          {['Market', 'Portfolio', 'Watchlist', 'Paper Trade'].map((label) => (
            <span
              key={label}
              className="h-9 px-3 flex items-center text-sm rounded-md cursor-not-allowed select-none"
              style={{ color: 'var(--muted-foreground)' }}
              title="Coming soon"
            >
              {label}
            </span>
          ))}
        </div>

        {/* User menu */}
        <div className="ml-auto relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="h-9 px-3 flex items-center gap-2 rounded-md text-sm transition-colors duration-150"
            style={{ color: 'var(--foreground)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {/* Avatar */}
            <span
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
              style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.15)', color: 'var(--primary)' }}
            >
              {initials}
            </span>
            <span className="hidden sm:block">{user?.name}</span>
            <ChevronDown
              className="h-3.5 w-3.5 stroke-[1.5] transition-transform duration-150"
              style={{
                color: 'var(--muted-foreground)',
                transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-11 w-52 rounded-lg border py-1 z-50"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  boxShadow: '0 8px 32px -8px oklch(0 0 0 / 0.5)',
                }}
              >
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {user?.name}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>
                    {user?.email}
                  </p>
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
      </nav>

      {/* ─── Main Content ─── */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-12">

        {/* Welcome header */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--primary)' }}>
            — Dashboard
          </p>
          <h1 className="font-display text-4xl md:text-5xl mb-2" style={{ color: 'var(--foreground)' }}>
            Good morning,{' '}
            <em style={{ color: 'var(--primary)', fontStyle: 'italic' }}>{firstName}</em>
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Your account is active. Market data and trading features launch in Phase 1.
          </p>
        </div>

        {/* ─── Stats strip ─── */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 rounded-lg border mb-10 overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="p-6 flex flex-col gap-1"
              style={{
                borderRight: i < STATS.length - 1 ? '1px solid var(--border)' : 'none',
                borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                backgroundColor: 'var(--surface)',
              }}
            >
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted-foreground)' }}>
                {stat.label}
              </p>
              <p className="font-mono text-2xl md:text-3xl tabular-nums mt-1" style={{ color: 'var(--foreground)' }}>
                {stat.value}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {stat.up === true && (
                  <ArrowUpRight className="h-3 w-3 stroke-[2]" style={{ color: 'var(--primary)' }} />
                )}
                {stat.up === false && (
                  <ArrowDownRight className="h-3 w-3 stroke-[2]" style={{ color: 'var(--destructive)' }} />
                )}
                <span
                  className="font-mono text-xs tabular-nums"
                  style={{
                    color:
                      stat.up === true
                        ? 'var(--primary)'
                        : stat.up === false
                        ? 'var(--destructive)'
                        : 'var(--muted-foreground)',
                  }}
                >
                  {stat.sub}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Account info card ─── */}
        <div
          className="rounded-lg border p-6 mb-10 flex items-start gap-4"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0"
            style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.12)', color: 'var(--primary)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{user?.name}</p>
            <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>{user?.email}</p>
            <div className="flex items-center gap-4 mt-3">
              <span
                className="text-xs uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border font-mono"
                style={{
                  color: 'var(--primary)',
                  borderColor: 'oklch(0.78 0.16 152 / 0.3)',
                  backgroundColor: 'oklch(0.78 0.16 152 / 0.08)',
                }}
              >
                {user?.role ?? 'user'}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                Member since{' '}
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Feature cards ─── */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] mb-6" style={{ color: 'var(--muted-foreground)' }}>
            Platform Features
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, description, status }) => (
              <div
                key={title}
                className="rounded-lg border p-6 flex flex-col gap-4 transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(0.28 0.014 250 / 0.8)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.backgroundColor = 'var(--surface)';
                }}
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.1)' }}
                >
                  <Icon className="h-5 w-5 stroke-[1.5]" style={{ color: 'var(--primary)' }} />
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                    {title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    {description}
                  </p>
                </div>

                <div className="mt-auto flex items-center gap-1.5">
                  <Lock className="h-3 w-3 stroke-[1.5]" style={{ color: 'var(--muted-foreground)' }} />
                  <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    {status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
