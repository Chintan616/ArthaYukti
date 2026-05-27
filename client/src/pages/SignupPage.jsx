import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, TrendingUp, UserPlus, AlertCircle, Check } from 'lucide-react';
import { signupUser, clearError } from '../store/slices/authSlice';
import toast from 'react-hot-toast';

const strength = (pw) => {
  if (!pw) return -1;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]|[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};
const S_LABELS = ['Weak', 'Fair', 'Strong'];
const S_COLORS = ['oklch(0.66 0.22 22)', 'oklch(0.8 0.14 80)', 'oklch(0.78 0.16 152)'];

export default function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm]     = useState({ name: '', email: '', password: '' });
  const [showPass, setShow] = useState(false);

  const pwStrength = strength(form.password);

  const handleChange = (e) => {
    dispatch(clearError());
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Please enter a valid email';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valErr = validate();
    if (valErr) { dispatch({ type: 'auth/setError', payload: valErr }); return; }
    const result = await dispatch(signupUser({ name: form.name.trim(), email: form.email, password: form.password }));
    if (signupUser.fulfilled.match(result)) {
      toast.success('Account created! Welcome to ArthaYukti.');
      navigate('/dashboard/market');
    }
  };

  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--input)', color: 'var(--foreground)', outline: 'none' };
  const focusFn = (e) => { e.target.style.borderColor = 'var(--ring)'; e.target.style.boxShadow = '0 0 0 1px var(--ring)'; };
  const blurFn  = (e) => { e.target.style.borderColor = 'var(--input)'; e.target.style.boxShadow = 'none'; };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <div className="absolute inset-0 grid-bg radial-fade pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.08)' }} />

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
            <TrendingUp className="h-5 w-5 stroke-[1.5]" style={{ color: 'var(--primary-foreground)' }} />
          </div>
          <span className="font-display text-2xl" style={{ color: 'var(--foreground)' }}>ArthaYukti</span>
        </div>

        <div className="rounded-lg border p-8" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--foreground)' }}>Create your account</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>Start trading smarter with AI-powered insights</p>

          {error && (
            <div className="mb-6 p-3.5 rounded-md border flex items-start gap-2.5 text-sm" style={{ backgroundColor: 'oklch(0.66 0.22 22 / 0.08)', borderColor: 'oklch(0.66 0.22 22 / 0.3)', color: 'var(--destructive)' }}>
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 stroke-[1.5]" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              { id: 'name',     label: 'Your Name',      type: 'text',     auto: 'name',     ph: 'John Doe' },
              { id: 'email',    label: 'Email Address',  type: 'email',    auto: 'email',    ph: 'you@example.com' },
            ].map(({ id, label, type, auto, ph }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>{label}</label>
                <input
                  id={id} name={id} type={type} autoComplete={auto}
                  value={form[id]} onChange={handleChange} placeholder={ph} required
                  className="w-full h-11 px-3.5 rounded-md text-sm"
                  style={inputStyle} onFocus={focusFn} onBlur={blurFn}
                />
              </div>
            ))}

            <div>
              <label htmlFor="password" className="block text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>Password</label>
              <div className="relative">
                <input
                  id="password" name="password" type={showPass ? 'text' : 'password'} autoComplete="new-password"
                  value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required
                  className="w-full h-11 px-3.5 pr-11 rounded-md text-sm"
                  style={inputStyle} onFocus={focusFn} onBlur={blurFn}
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }}>
                  {showPass ? <EyeOff className="h-4 w-4 stroke-[1.5]" /> : <Eye className="h-4 w-4 stroke-[1.5]" />}
                </button>
              </div>
              {pwStrength >= 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1 mb-1.5">
                    {[0, 1, 2].map((i) => <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300" style={{ backgroundColor: i <= pwStrength ? S_COLORS[pwStrength] : 'var(--muted)' }} />)}
                  </div>
                  <p className="text-xs" style={{ color: S_COLORS[pwStrength] }}>{S_LABELS[pwStrength]}</p>
                </div>
              )}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full h-11 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 mt-2"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: '0 0 0 1px oklch(0.78 0.16 152 / 0.4), 0 8px 24px -8px oklch(0.78 0.16 152 / 0.5)' }}
            >
              {loading ? <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <><UserPlus className="h-4 w-4 stroke-[1.5]" />Create Account</>}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
            {['Real-time market data & live charts', 'Paper trading with virtual ₹1,00,000', 'AI-powered portfolio analysis (Phase 3)'].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <Check className="h-3.5 w-3.5 flex-shrink-0 stroke-[2]" style={{ color: 'var(--primary)' }} />
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
