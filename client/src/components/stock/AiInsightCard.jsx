import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle } from 'lucide-react';
import Skeleton from '../ui/Skeleton';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt  = (n, dec = 2) => n != null ? n.toLocaleString('en-IN', { maximumFractionDigits: dec }) : '—';
const fmtP = (n)          => n != null ? `${n > 0 ? '+' : ''}${n.toFixed(2)}%` : '—';

const SENTIMENT_CONFIG = {
  BULLISH: {
    label:       'BULLISH',
    dot:         '🟢',
    borderColor: 'oklch(0.65 0.2 150 / 0.5)',
    glowColor:   'oklch(0.65 0.2 150 / 0.06)',
    badgeBg:     'oklch(0.65 0.2 150 / 0.12)',
    badgeText:   'oklch(0.72 0.2 150)',
    tagBg:       'oklch(0.65 0.2 150 / 0.1)',
    tagText:     'oklch(0.72 0.2 150)',
  },
  BEARISH: {
    label:       'BEARISH',
    dot:         '🔴',
    borderColor: 'oklch(0.66 0.22 22 / 0.5)',
    glowColor:   'oklch(0.66 0.22 22 / 0.05)',
    badgeBg:     'oklch(0.66 0.22 22 / 0.12)',
    badgeText:   'oklch(0.72 0.2 22)',
    tagBg:       'oklch(0.66 0.22 22 / 0.1)',
    tagText:     'oklch(0.72 0.2 22)',
  },
  NEUTRAL: {
    label:       'NEUTRAL',
    dot:         '🟡',
    borderColor: 'oklch(0.8 0.14 85 / 0.4)',
    glowColor:   'oklch(0.8 0.14 85 / 0.04)',
    badgeBg:     'oklch(0.8 0.14 85 / 0.12)',
    badgeText:   'oklch(0.75 0.16 85)',
    tagBg:       'oklch(0.8 0.14 85 / 0.1)',
    tagText:     'oklch(0.75 0.16 85)',
  },
};

const TrendRow = ({ label, value }) => {
  if (value == null) return null;
  const pos = value >= 0;
  const color = pos ? 'oklch(0.72 0.2 150)' : 'oklch(0.72 0.2 22)';
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs uppercase tracking-[0.14em] font-mono w-8" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        {pos
          ? <TrendingUp  className="h-3.5 w-3.5" style={{ color }} />
          : <TrendingDown className="h-3.5 w-3.5" style={{ color }} />
        }
        <span className="font-mono text-sm tabular-nums font-medium" style={{ color }}>
          {fmtP(value)}
        </span>
      </div>
    </div>
  );
};

const MaRow = ({ label, value, above }) => {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm tabular-nums" style={{ color: 'var(--foreground)' }}>₹{fmt(value)}</span>
        {above != null && (
          above
            ? <CheckCircle2 className="h-4 w-4" style={{ color: 'oklch(0.72 0.2 150)' }} />
            : <XCircle      className="h-4 w-4" style={{ color: 'oklch(0.72 0.2 22)'  }} />
        )}
      </div>
    </div>
  );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const InsightSkeleton = () => (
  <div className="space-y-4">
    {/* AI card */}
    <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
    {/* Stats row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
    {/* Trend + MA */}
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function AiInsightCard({ symbol }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const token = localStorage.getItem('ay_token');
        const aiApiUrl = import.meta.env.VITE_AI_API_URL || '/ai-api';
        const res   = await fetch(`${aiApiUrl}/insight-card/${symbol}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }

        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) return <InsightSkeleton />;

  if (error) return (
    <div className="rounded-xl border p-5 text-sm" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
        <span className="font-medium" style={{ color: 'var(--foreground)' }}>AI Overview unavailable</span>
      </div>
      <p className="text-xs">{error}</p>
    </div>
  );

  if (!data) return null;

  const { fundamentals: f, derived: d, news, ai } = data;
  const cfg = SENTIMENT_CONFIG[ai?.sentiment] ?? SENTIMENT_CONFIG.NEUTRAL;

  return (
    <div className="space-y-4">

      {/* ── Section 1: AI Insight Card ──────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5 transition-colors duration-500"
        style={{
          backgroundColor: cfg.glowColor,
          borderColor:     cfg.borderColor,
          boxShadow:       `0 0 0 1px ${cfg.borderColor}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: cfg.badgeText }} />
            <span className="text-xs uppercase tracking-[0.18em] font-medium" style={{ color: 'var(--muted-foreground)' }}>
              AI Overview
            </span>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeText }}
          >
            {cfg.dot} {cfg.label}
          </span>
        </div>

        {/* Tags */}
        {ai?.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {ai.tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: cfg.tagBg, color: cfg.tagText }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Summary */}
        {ai?.summary && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
            {ai.summary}
          </p>
        )}
      </div>

      {/* ── Section 2: Key Stats Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 52W High */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>52W High</p>
          <p className="font-mono text-base tabular-nums font-medium" style={{ color: 'var(--foreground)' }}>
            {f?.week_52_high ? `₹${fmt(f.week_52_high)}` : '—'}
          </p>
          {d?.dist_52w_high != null && (
            <p className="font-mono text-xs tabular-nums mt-1.5 flex items-center gap-0.5"
              style={{ color: d.dist_52w_high >= 0 ? 'oklch(0.72 0.2 150)' : 'oklch(0.72 0.2 22)' }}>
              {d.dist_52w_high >= 0
                ? <ArrowUpRight   className="h-3 w-3" />
                : <ArrowDownRight className="h-3 w-3" />
              }
              {fmtP(Math.abs(d.dist_52w_high))} away
            </p>
          )}
        </div>

        {/* 52W Low */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>52W Low</p>
          <p className="font-mono text-base tabular-nums font-medium" style={{ color: 'var(--foreground)' }}>
            {f?.week_52_low ? `₹${fmt(f.week_52_low)}` : '—'}
          </p>
          {d?.dist_52w_low != null && (
            <p className="font-mono text-xs tabular-nums mt-1.5 flex items-center gap-0.5"
              style={{ color: 'oklch(0.72 0.2 150)' }}>
              <ArrowUpRight className="h-3 w-3" />
              {fmtP(d.dist_52w_low)} above
            </p>
          )}
        </div>

        {/* P/E Ratio */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>P/E Ratio</p>
          <p className="font-mono text-base tabular-nums font-medium" style={{ color: 'var(--foreground)' }}>
            {f?.pe_ratio != null ? `${fmt(f.pe_ratio)}x` : '—'}
          </p>
          {f?.rev_growth != null && (
            <p className="font-mono text-xs tabular-nums mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
              Rev growth {fmtP(f.rev_growth)}
            </p>
          )}
        </div>

        {/* Div Yield */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>Div Yield</p>
          <p className="font-mono text-base tabular-nums font-medium" style={{ color: 'var(--foreground)' }}>
            {f?.div_yield != null ? `${fmt(f.div_yield)}%` : '—'}
          </p>
        </div>
      </div>

      {/* ── Section 3: Trend + Moving Averages ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Trend */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--muted-foreground)' }}>
            Trend
          </p>
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
            <TrendRow label="1W" value={d?.return_1w} />
            <TrendRow label="1M" value={d?.return_1m} />
            <TrendRow label="6M" value={d?.return_6m} />
          </div>
        </div>

        {/* Moving Averages */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--muted-foreground)' }}>
            Moving Averages
          </p>
          <div className="divide-y">
            <MaRow label="20D SMA" value={d?.sma_20} above={d?.above_sma_20} />
            <MaRow label="50D SMA" value={d?.sma_50} above={d?.above_sma_50} />
          </div>
          {(d?.sma_20 == null && d?.sma_50 == null) && (
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Insufficient history</p>
          )}
        </div>
      </div>

      {/* ── Section 4: News Feed ─────────────────────────────────────────────── */}
      {news?.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs uppercase tracking-[0.18em] font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Latest News
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {news.map((item, i) => (
              <div key={i} className="flex items-start justify-between px-4 py-3 gap-4">
                <div className="flex items-start gap-2 min-w-0">
                  <Minus className="h-3 w-3 mt-1 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                  <p className="text-sm leading-snug" style={{ color: 'var(--foreground)' }}>{item.title}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {item.publisher && (
                    <p className="text-xs font-mono font-medium" style={{ color: 'var(--muted-foreground)' }}>{item.publisher}</p>
                  )}
                  {item.time_ago && (
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.time_ago}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
