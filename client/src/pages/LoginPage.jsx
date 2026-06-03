import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, TrendingUp, LogIn, AlertCircle, ArrowLeft } from 'lucide-react';
import { loginUser, googleAuthUser, clearError } from '../store/slices/authSlice';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm]             = useState({ email: '', password: '' });
  const [showPassword, setShowPass] = useState(false);

  const handleChange = (e) => {
    dispatch(clearError());
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser({ email: form.email, password: form.password }));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back!');
      navigate('/dashboard/market');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const result = await dispatch(googleAuthUser(credentialResponse.credential));
    if (googleAuthUser.fulfilled.match(result)) {
      toast.success('Welcome back!');
      navigate('/dashboard/market');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--background)', perspective: '1200px' }}>
      <div className="absolute inset-0 grid-bg radial-fade pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.08)' }} />

      <Link 
        to="/" 
        className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2 text-sm font-medium transition-colors z-10" 
        style={{ color: 'var(--muted-foreground)' }} 
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)' }} 
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)' }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <motion.div 
        key="login-card"
        initial={{ rotateY: -90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        exit={{ rotateY: 90, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="relative w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
            <TrendingUp className="h-5 w-5 stroke-[1.5]" style={{ color: 'var(--primary-foreground)' }} />
          </div>
          <span className="font-display text-2xl" style={{ color: 'var(--foreground)' }}>Artha<span className="font-sans font-medium text-primary">युक्ति</span></span>
        </div>

        <div className="rounded-lg border p-8" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--foreground)' }}>Welcome back</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>Sign in to your trading account</p>

          {error && (
            <div className="mb-6 p-3.5 rounded-md border flex items-start gap-2.5 text-sm" style={{ backgroundColor: 'oklch(0.66 0.22 22 / 0.08)', borderColor: 'oklch(0.66 0.22 22 / 0.3)', color: 'var(--destructive)' }}>
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 stroke-[1.5]" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>Email Address</label>
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={form.email} onChange={handleChange} placeholder="you@example.com" required
                className="w-full h-11 px-3.5 rounded-md text-sm"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--input)', color: 'var(--foreground)', outline: 'none' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--ring)'; e.target.style.boxShadow = '0 0 0 1px var(--ring)'; }}
                onBlur={(e)  => { e.target.style.borderColor = 'var(--input)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>Password</label>
              <div className="relative">
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  value={form.password} onChange={handleChange} placeholder="••••••••" required
                  className="w-full h-11 px-3.5 pr-11 rounded-md text-sm"
                  style={{ backgroundColor: 'var(--background)', border: '1px solid var(--input)', color: 'var(--foreground)', outline: 'none' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--ring)'; e.target.style.boxShadow = '0 0 0 1px var(--ring)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--input)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }}>
                  {showPassword ? <EyeOff className="h-4 w-4 stroke-[1.5]" /> : <Eye className="h-4 w-4 stroke-[1.5]" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full h-11 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 mt-2"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: '0 0 0 1px oklch(0.78 0.16 152 / 0.4), 0 8px 24px -8px oklch(0.78 0.16 152 / 0.5)' }}
            >
              {loading ? <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <><LogIn className="h-4 w-4 stroke-[1.5]" />Sign In</>}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
          </div>

          {/* Google Login */}
          <div className="mt-4 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed')}
              theme="filled_black"
              size="large"
              text="continue_with"
              shape="rectangular"
              width="368"
            />
          </div>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Don&apos;t have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--primary)' }}>Create account</Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
          By signing in you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
