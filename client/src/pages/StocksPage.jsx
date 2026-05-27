import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllStocks, fetchStockDetail, fetchStockHistory } from '../store/slices/stockSlice';
import { addToWatchlist, removeFromWatchlist, fetchWatchlist } from '../store/slices/watchlistSlice';
import { createAlert } from '../store/slices/alertSlice';
import StockChart from '../components/stock/StockChart';
import PriceChange from '../components/stock/PriceChange';
import Skeleton from '../components/ui/Skeleton';
import { Star, Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StocksPage() {
  const { symbol: routeSymbol } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { allStocks, loadingMap, currentStock, history, quotes } = useSelector((s) => s.stocks);
  const { symbols: watchlistSymbols } = useSelector((s) => s.watchlist);
  const [resolution, setResolution] = useState('D');
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'overview'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertCondition, setAlertCondition] = useState('ABOVE');
  const [alertTargetPrice, setAlertTargetPrice] = useState('');

  // Fetch all stocks on mount if not available
  useEffect(() => {
    if (allStocks.length === 0) dispatch(fetchAllStocks());
    dispatch(fetchWatchlist());
  }, [dispatch, allStocks.length]);

  const activeSymbol = routeSymbol?.toUpperCase() || allStocks[0]?.symbol || 'RELIANCE.BO';

  useEffect(() => {
    if (activeSymbol) {
      dispatch(fetchStockDetail(activeSymbol));
      dispatch(fetchStockHistory({ symbol: activeSymbol, resolution }));
    }
  }, [activeSymbol, resolution, dispatch]);

  // Keep URL in sync
  useEffect(() => {
    if (!routeSymbol && allStocks.length > 0) {
      navigate(`/dashboard/stocks/${allStocks[0].symbol}`, { replace: true });
    }
  }, [routeSymbol, allStocks, navigate]);

  const liveQuote = quotes[activeSymbol] ?? currentStock?.quote;
  const profile = currentStock?.profile;
  const loadingDetail = loadingMap.detail;
  const loadingHistory = loadingMap.history;
  const candles = history[`${activeSymbol}:${resolution}`] || [];

  const filteredStocks = allStocks.filter(s => 
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (quotes[s.symbol]?.name || s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isWatchlisted = watchlistSymbols.includes(activeSymbol);

  const toggleWatchlist = async () => {
    if (isWatchlisted) {
      await dispatch(removeFromWatchlist(activeSymbol));
      toast.success(`${activeSymbol} removed from Watchlist`);
    } else {
      const res = await dispatch(addToWatchlist(activeSymbol));
      if (addToWatchlist.fulfilled.match(res)) {
        toast.success(`${activeSymbol} added to Watchlist`);
      } else {
        toast.error('Failed to add to watchlist');
      }
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!alertTargetPrice) return;
    
    const res = await dispatch(createAlert({
      symbol: activeSymbol,
      condition: alertCondition,
      targetPrice: Number(alertTargetPrice)
    }));

    if (createAlert.fulfilled.match(res)) {
      toast.success(`Alert set for ${activeSymbol} ${alertCondition} ₹${alertTargetPrice}`);
      setAlertModalOpen(false);
      setAlertTargetPrice('');
    } else {
      toast.error('Failed to set alert');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Left Sidebar */}
      <div className="w-1/3 flex flex-col rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display text-xl" style={{ color: 'var(--foreground)' }}>Stocks</h2>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>BSE Top 50</p>
          </div>
          <input
            type="text"
            placeholder="Filter stocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 px-3 rounded-md text-sm border focus:outline-none"
            style={{ 
              backgroundColor: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)'
            }}
          />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loadingMap.allStocks && allStocks.length === 0 ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="divide-y" style={{ '--divide-color': 'var(--border)' }}>
              {filteredStocks.map((s) => {
                const q = quotes[s.symbol] ?? s;
                const isActive = s.symbol === activeSymbol;
                return (
                  <button
                    key={s.symbol}
                    onClick={() => navigate(`/dashboard/stocks/${s.symbol}`)}
                    className={`w-full flex items-center justify-between p-4 text-left transition-colors border-l-4 ${isActive ? 'border-primary' : 'border-transparent'}`}
                    style={{
                      backgroundColor: isActive ? 'var(--muted)' : 'transparent',
                      borderLeftColor: isActive ? 'var(--primary)' : 'transparent'
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--surface-elevated)' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <div>
                      <p className="font-mono text-sm font-medium" style={{ color: 'var(--foreground)' }}>{s.symbol}</p>
                      <p className="text-xs truncate w-32" style={{ color: 'var(--muted-foreground)' }}>{q.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>₹{q.price?.toFixed(2)}</p>
                      <PriceChange change={q.change} changePercent={q.changePercent} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 flex flex-col rounded-lg border overflow-hidden p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        {!activeSymbol || (loadingDetail && currentStock?.symbol !== activeSymbol) ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="font-mono text-3xl font-medium flex items-center gap-3" style={{ color: 'var(--foreground)' }}>
                  {activeSymbol}
                  {profile?.exchange && (
                    <span className="text-xs px-2 py-0.5 rounded-full border font-mono font-normal" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                      {profile.exchange}
                    </span>
                  )}
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{profile?.name || liveQuote?.name}</p>
                
                {liveQuote && (
                  <div className="flex items-end gap-3 mt-3">
                    <span className="font-mono text-4xl font-medium tabular-nums" style={{ color: 'var(--foreground)' }}>
                      ₹{liveQuote.price?.toFixed(2)}
                    </span>
                    <PriceChange change={liveQuote.change} changePercent={liveQuote.changePercent} showAbsolute className="text-sm mb-1" />
                  </div>
                )}
              </div>

              {/* Actions & Tabs */}
              <div className="flex flex-col items-end gap-4">
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleWatchlist}
                    className="h-9 px-3 flex items-center gap-2 rounded-md border text-sm font-medium transition-colors"
                    style={{ 
                      backgroundColor: isWatchlisted ? 'oklch(0.85 0.14 85 / 0.15)' : 'var(--surface)', 
                      borderColor: isWatchlisted ? 'var(--warning)' : 'var(--border)',
                      color: isWatchlisted ? 'var(--warning)' : 'var(--foreground)'
                    }}
                  >
                    <Star className="h-4 w-4" fill={isWatchlisted ? "currentColor" : "none"} strokeWidth={1.5} />
                    {isWatchlisted ? 'Watchlisted' : 'Watchlist'}
                  </button>
                  <button
                    onClick={() => {
                      setAlertTargetPrice(liveQuote?.price?.toFixed(2) || '');
                      setAlertModalOpen(true);
                    }}
                    className="h-9 px-3 flex items-center gap-2 rounded-md border text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    <Bell className="h-4 w-4 stroke-[1.5]" />
                    Alert
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center rounded-lg p-1 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setActiveTab('chart')}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === 'chart' ? 'var(--surface-elevated)' : 'transparent',
                    color: activeTab === 'chart' ? 'var(--foreground)' : 'var(--muted-foreground)',
                    boxShadow: activeTab === 'chart' ? '0 1px 2px oklch(0 0 0 / 0.1)' : 'none'
                  }}
                >
                  Chart
                </button>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === 'overview' ? 'var(--surface-elevated)' : 'transparent',
                    color: activeTab === 'overview' ? 'var(--foreground)' : 'var(--muted-foreground)',
                    boxShadow: activeTab === 'overview' ? '0 1px 2px oklch(0 0 0 / 0.1)' : 'none'
                  }}
                >
                  Overview
                </button>
              </div>
            </div>
          </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
              {activeTab === 'chart' ? (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <StockChart
                      candles={candles}
                      resolution={resolution}
                      onResolutionChange={setResolution}
                      loading={loadingHistory}
                    />
                  </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Open',       value: liveQuote?.open },
                      { label: 'High',       value: liveQuote?.high },
                      { label: 'Low',        value: liveQuote?.low  },
                      { label: 'Prev Close', value: liveQuote?.prevClose },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg border p-4" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                        <p className="text-xs uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
                        <p className="font-mono text-lg tabular-nums" style={{ color: 'var(--foreground)' }}>
                          {value ? `₹${value.toFixed(2)}` : '—'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {profile?.marketCapitalization && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { label: 'Market Cap',  value: `₹${(profile.marketCapitalization / 10).toFixed(1)}Cr` },
                        { label: 'Industry',    value: profile.finnhubIndustry || profile.industry },
                        { label: 'Country',     value: profile.country },
                      ].map(({ label, value }) => value && (
                        <div key={label} className="rounded-lg border p-4" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                          <p className="text-xs uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Alert Modal */}
      {alertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'oklch(0 0 0 / 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-xl border shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-sans font-medium text-lg" style={{ color: 'var(--foreground)' }}>Set Alert for {activeSymbol}</h3>
              <button onClick={() => setAlertModalOpen(false)} className="opacity-70 hover:opacity-100 transition-opacity">
                <X className="h-5 w-5" style={{ color: 'var(--foreground)' }} />
              </button>
            </div>
            <form onSubmit={handleCreateAlert} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Condition</label>
                <div className="flex rounded-md border p-1" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setAlertCondition('ABOVE')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded ${alertCondition === 'ABOVE' ? 'shadow-sm' : ''}`}
                    style={{ backgroundColor: alertCondition === 'ABOVE' ? 'var(--surface-elevated)' : 'transparent', color: alertCondition === 'ABOVE' ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                  >
                    Above
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertCondition('BELOW')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded ${alertCondition === 'BELOW' ? 'shadow-sm' : ''}`}
                    style={{ backgroundColor: alertCondition === 'BELOW' ? 'var(--surface-elevated)' : 'transparent', color: alertCondition === 'BELOW' ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                  >
                    Below
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Target Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={alertTargetPrice}
                  onChange={(e) => setAlertTargetPrice(e.target.value)}
                  className="w-full h-10 px-3 rounded-md text-sm border focus:outline-none"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  placeholder={`Current: ${liveQuote?.price?.toFixed(2)}`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-10 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  Create Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
