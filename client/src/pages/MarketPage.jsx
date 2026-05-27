import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fetchTrending, fetchGainersLosers } from '../store/slices/stockSlice';
import StockCard from '../components/stock/StockCard';
import MarketIndices from '../components/stock/MarketIndices';
import PriceChange from '../components/stock/PriceChange';
import { SkeletonCard } from '../components/ui/Skeleton';

const LiveDot = () => (
  <span className="flex items-center gap-1.5">
    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ backgroundColor: 'var(--primary)' }} />
    <span className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--primary)' }}>Live</span>
  </span>
);

export default function MarketPage() {
  const dispatch      = useDispatch();
  const navigate      = useNavigate();
  const { trending, gainers, losers, loadingMap, quotes } = useSelector((s) => s.stocks);

  useEffect(() => {
    dispatch(fetchTrending());
    dispatch(fetchGainersLosers());
  }, [dispatch]);


  // Use live socket quote if available, else fall back to fetched data
  const liveQuote = (stock) => {
    const live = quotes[stock.symbol];
    return live ?? stock;
  };

  return (
    <div className="space-y-8">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--muted-foreground)' }}>Overview</p>
          <h1 className="font-display text-3xl md:text-4xl" style={{ color: 'var(--foreground)' }}>
            Market Dashboard
          </h1>
        </div>
        <LiveDot />
      </div>

      <MarketIndices />

      {/* ─── Trending ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 stroke-[1.5]" style={{ color: 'var(--primary)' }} />
          <h2 className="font-sans font-medium text-sm" style={{ color: 'var(--foreground)' }}>Trending</h2>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Most volatile today</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {loadingMap.trending
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            : trending.map((s) => {
                const q = liveQuote(s);
                return <StockCard key={s.symbol} symbol={q.symbol} name={q.name} price={q.price} change={q.change} changePercent={q.changePercent} />;
              })}
        </div>
      </section>

      {/* ─── Gainers / Losers ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gainers */}
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <ArrowUpRight className="h-4 w-4 stroke-[1.5]" style={{ color: 'var(--primary)' }} />
            <h2 className="font-sans font-medium text-sm" style={{ color: 'var(--foreground)' }}>Top Gainers</h2>
          </div>
          <div className="divide-y" style={{ '--divide-color': 'var(--border)' }}>
            {loadingMap.gainersLosers
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="space-y-1"><div className="h-3.5 w-12 animate-pulse rounded" style={{ backgroundColor: 'var(--surface-elevated)' }} /><div className="h-3 w-24 animate-pulse rounded" style={{ backgroundColor: 'var(--surface-elevated)' }} /></div>
                    <div className="h-3.5 w-16 animate-pulse rounded" style={{ backgroundColor: 'var(--surface-elevated)' }} />
                  </div>
                ))
              : gainers.map((s) => {
                  const q = liveQuote(s);
                  return (
                    <button
                      key={q.symbol}
                      onClick={() => navigate(`/dashboard/stocks/${q.symbol}`)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors duration-100 border-b last:border-0"
                      style={{ borderColor: 'var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div>
                        <p className="font-mono text-sm font-medium" style={{ color: 'var(--foreground)' }}>{q.symbol}</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{q.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm tabular-nums" style={{ color: 'var(--foreground)' }}>₹{q.price?.toFixed(2)}</p>
                        <PriceChange change={q.change} changePercent={q.changePercent} />
                      </div>
                    </button>
                  );
                })}
          </div>
        </div>

        {/* Losers */}
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <ArrowDownRight className="h-4 w-4 stroke-[1.5]" style={{ color: 'var(--destructive)' }} />
            <h2 className="font-sans font-medium text-sm" style={{ color: 'var(--foreground)' }}>Top Losers</h2>
          </div>
          <div>
            {loadingMap.gainersLosers
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="space-y-1"><div className="h-3.5 w-12 animate-pulse rounded" style={{ backgroundColor: 'var(--surface-elevated)' }} /><div className="h-3 w-24 animate-pulse rounded" style={{ backgroundColor: 'var(--surface-elevated)' }} /></div>
                    <div className="h-3.5 w-16 animate-pulse rounded" style={{ backgroundColor: 'var(--surface-elevated)' }} />
                  </div>
                ))
              : losers.map((s) => {
                  const q = liveQuote(s);
                  return (
                    <button
                      key={q.symbol}
                      onClick={() => navigate(`/dashboard/stocks/${q.symbol}`)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors duration-100 border-b last:border-0"
                      style={{ borderColor: 'var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div>
                        <p className="font-mono text-sm font-medium" style={{ color: 'var(--foreground)' }}>{q.symbol}</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{q.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm tabular-nums" style={{ color: 'var(--foreground)' }}>₹{q.price?.toFixed(2)}</p>
                        <PriceChange change={q.change} changePercent={q.changePercent} />
                      </div>
                    </button>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
