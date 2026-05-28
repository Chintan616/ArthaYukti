import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';

import store from './store';
import { checkAuth } from './store/slices/authSlice';
import { fetchPortfolio } from './store/slices/portfolioSlice';

import DashboardLayout from './layouts/DashboardLayout';
import LoginPage       from './pages/LoginPage';
import SignupPage      from './pages/SignupPage';
import MarketPage      from './pages/MarketPage';
import StocksPage      from './pages/StocksPage';
import WatchlistPage   from './pages/WatchlistPage';
import PortfolioPage   from './pages/PortfolioPage';
import WalletPage      from './pages/WalletPage';

// ─── Route Guards ────────────────────────────────────────────────────────────

const RequireAuth = ({ children }) => {
  const { user, loading } = useSelector((s) => s.auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--muted)', borderTopColor: 'var(--primary)' }} />
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted-foreground)' }}>Loading</p>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

const PublicOnly = ({ children }) => {
  const { user, loading } = useSelector((s) => s.auth);
  if (loading) return null;
  return user ? <Navigate to="/dashboard/market" replace /> : children;
};

// ─── App init ────────────────────────────────────────────────────────────────

const AppInit = () => {
  const dispatch = useDispatch();
  const user     = useSelector((s) => s.auth.user);

  // On mount: restore session from stored token
  useEffect(() => { dispatch(checkAuth()); }, [dispatch]);

  // Once authenticated, pre-load portfolio balance for nav display
  useEffect(() => {
    if (user) dispatch(fetchPortfolio());
  }, [user, dispatch]);

  return null;
};

// ─── Router ──────────────────────────────────────────────────────────────────

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />

    <Route path="/login"  element={<PublicOnly><LoginPage /></PublicOnly>} />
    <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />

    <Route
      path="/dashboard"
      element={<RequireAuth><DashboardLayout /></RequireAuth>}
    >
      <Route index element={<Navigate to="market" replace />} />
      <Route path="market"          element={<MarketPage />} />
      <Route path="stocks"          element={<StocksPage />} />
      <Route path="stocks/:symbol"  element={<StocksPage />} />
      <Route path="watchlist"       element={<WatchlistPage />} />
      <Route path="portfolio"       element={<PortfolioPage />} />
      <Route path="wallet"          element={<WalletPage />} />
    </Route>

    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

// ─── Root ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppInit />
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background:  'oklch(0.22 0.016 250)',
              color:       'oklch(0.96 0.005 250)',
              border:      '1px solid oklch(0.28 0.014 250)',
              fontFamily:  'Inter, sans-serif',
              fontSize:    '14px',
              borderRadius:'6px',
            },
            success: { iconTheme: { primary: 'oklch(0.78 0.16 152)', secondary: 'oklch(0.16 0.012 250)' } },
            error:   { iconTheme: { primary: 'oklch(0.66 0.22 22)',  secondary: 'oklch(0.16 0.012 250)' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  );
}
