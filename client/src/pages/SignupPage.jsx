import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, UserPlus, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Basic password strength — returns 0-3
const passwordStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const STRENGTH_LABELS = ['Weak', 'Fair', 'Strong'];
const STRENGTH_COLORS = [
  'oklch(0.66 0.22 22)',
  'oklch(0.8 0.14 80)',
  'oklch(0.78 0.16 152)',
];

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signup } = useAuth();
  const navigate = useNavigate();

  const strength = form.password.length > 0 ? passwordStrength(form.password) : -1;

  const handleChange = (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.name.trim() || form.name.trim().length < 2)
      return 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      return 'Please enter a valid email address';
    if (form.password.length < 6)
      return 'Password must be at least 6 characters';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signup(form.name.trim(), form.email, form.password);
      toast.success('Account created! Welcome to ArthaYukti.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Shared input focus/blur handlers
  const focusStyle = (e) => {
    e.target.style.borderColor = 'var(--ring)';
    e.target.style.boxShadow = '0 0 0 1px var(--ring)';
  };
  const blurStyle = (e) => {
    e.target.style.borderColor = 'var(--input)';
    e.target.style.boxShadow = 'none';
  };

  const inputClass =
    'w-full h-11 px-3.5 rounded-md text-sm transition-colors duration-150';
  const inputStyle = {
    backgroundColor: 'var(--background)',
    border: '1px solid var(--input)',
    color: 'var(--foreground)',
    outline: 'none',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--background)' }}
    >
      {/* Grid texture */}
      <div className="absolute inset-0 grid-bg radial-fade pointer-events-none" />

      {/* Ambient glow */}
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
            Create your account
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>
            Start trading smarter with AI-powered insights
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

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs uppercase tracking-[0.18em] mb-2"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className={inputClass}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>

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
                className={inputClass}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
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
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  required
                  className={`${inputClass} pr-11`}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
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

              {/* Password strength bar */}
              {strength >= 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1 mb-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-0.5 flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor:
                            i <= strength
                              ? STRENGTH_COLORS[strength]
                              : 'var(--muted)',
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-xs"
                    style={{ color: strength >= 0 ? STRENGTH_COLORS[strength] : 'var(--muted-foreground)' }}
                  >
                    {STRENGTH_LABELS[strength]}
                  </p>
                </div>
              )}
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
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 stroke-[1.5]" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Perks */}
          <div
            className="mt-6 pt-6 border-t space-y-2"
            style={{ borderColor: 'var(--border)' }}
          >
            {[
              'Real-time market data & live charts',
              'Paper trading with virtual ₹1,00,000',
              'AI-powered portfolio analysis (Phase 2)',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <Check className="h-3.5 w-3.5 flex-shrink-0 stroke-[2]" style={{ color: 'var(--primary)' }} />
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              className="transition-opacity duration-150"
              style={{ color: 'var(--primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
