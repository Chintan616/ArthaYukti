import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Shows a full-screen loader during the initial session restoration check,
// then redirects to /login if no valid user exists.
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Loading</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
