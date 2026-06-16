import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';

import store from './store';
import axiosInstance from './api/axios';
import RenderLoadingScreen from './components/RenderLoadingScreen';
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
import AiAnalystPage   from './pages/AiAnalystPage';
import LandingPage     from './pages/LandingPage';

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

const AppRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />

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
          <Route path="ai-analyst"      element={<AiAnalystPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

// ─── Server Wakeup Gate ──────────────────────────────────────────────────────
const ServerWakeupGate = ({ children }) => {
  const [serverAwake, setServerAwake] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Only show loader if the server doesn't respond within 500ms
    const loaderTimeout = setTimeout(() => {
      if (isMounted) setShowLoader(true);
    }, 500);

    const pingServer = async () => {
      try {
        const res = await axiosInstance.get('/health');
        if (res.data?.success) {
          clearTimeout(loaderTimeout);
          if (isMounted) setServerAwake(true);
        } else {
          if (isMounted) setTimeout(pingServer, 2000);
        }
      } catch (err) {
        if (isMounted) setTimeout(pingServer, 2000);
      }
    };

    pingServer();

    return () => {
      isMounted = false;
      clearTimeout(loaderTimeout);
    };
  }, []);

  if (serverAwake) {
    return children;
  }

  if (showLoader) {
    return <RenderLoadingScreen />;
  }

  return null;
};

// ─── Root ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <Provider store={store}>
      <ServerWakeupGate>
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
      </ServerWakeupGate>
    </Provider>
    </GoogleOAuthProvider>
  );
}
