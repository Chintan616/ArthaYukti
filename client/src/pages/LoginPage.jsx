import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ backgroundColor: 'var(--background)' }}>

      {/* Grid texture layer */}
      <div className="absolute inset-0 grid-bg radial-fade pointer-events-none" />

      {/* Ambient emerald glow — top center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.08)' }}
      />

      <div className="relative w-full max-w-md">

        {/* Wordmark */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <TrendingUp className="h-5 w-5 stroke-[1.5]" style={{ color: 'var(--primary-foreground)' }} />
          </div>
          <span className="font-display text-2xl" style={{ color: 'var(--foreground)' }}>
            ArthaYukti
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-lg border p-8"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--foreground)' }}>
            Welcome back
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>
            Sign in to your trading account
          </p>

          {/* Inline error */}
          {error && (
            <div
              className="mb-6 p-3.5 rounded-md border flex items-start gap-2.5 text-sm"
              style={{
                backgroundColor: 'oklch(0.66 0.22 22 / 0.08)',
                borderColor: 'oklch(0.66 0.22 22 / 0.3)',
                color: 'var(--destructive)',
              }}
            >
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 stroke-[1.5]" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs uppercase tracking-[0.18em] mb-2"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="w-full h-11 px-3.5 rounded-md text-sm transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--input)',
                  color: 'var(--foreground)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--ring)';
                  e.target.style.boxShadow = '0 0 0 1px var(--ring)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--input)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs uppercase tracking-[0.18em] mb-2"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 px-3.5 pr-11 rounded-md text-sm transition-colors duration-150"
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--input)',
                    color: 'var(--foreground)',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--ring)';
                    e.target.style.boxShadow = '0 0 0 1px var(--ring)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--input)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150"
                  style={{ color: 'var(--muted-foreground)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4 stroke-[1.5]" />
                    : <Eye className="h-4 w-4 stroke-[1.5]" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                boxShadow: '0 0 0 1px oklch(0.78 0.16 152 / 0.4), 0 8px 24px -8px oklch(0.78 0.16 152 / 0.5)',
              }}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 stroke-[1.5]" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="transition-colors duration-150"
              style={{ color: 'var(--primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Create account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
          By signing in you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
