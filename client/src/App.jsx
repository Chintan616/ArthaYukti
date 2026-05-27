import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';

// Redirects already-authenticated users away from public auth pages
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route
      path="/login"
      element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      }
    />
    <Route
      path="/signup"
      element={
        <PublicRoute>
          <SignupPage />
        </PublicRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      }
    />
    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'oklch(0.22 0.016 250)',
              color: 'oklch(0.96 0.005 250)',
              border: '1px solid oklch(0.28 0.014 250)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '6px',
            },
            success: {
              iconTheme: {
                primary: 'oklch(0.78 0.16 152)',
                secondary: 'oklch(0.16 0.012 250)',
              },
            },
            error: {
              iconTheme: {
                primary: 'oklch(0.66 0.22 22)',
                secondary: 'oklch(0.16 0.012 250)',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
