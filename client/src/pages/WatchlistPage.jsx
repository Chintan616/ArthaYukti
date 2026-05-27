import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, Trash2, Search, X, Bell } from 'lucide-react';
import { fetchWatchlist, addToWatchlist, removeFromWatchlist } from '../store/slices/watchlistSlice';
import { fetchAlerts, deleteAlert, toggleAlert } from '../store/slices/alertSlice';
import { searchStocks, clearSearch } from '../store/slices/stockSlice';
import PriceChange from '../components/stock/PriceChange';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import useDebounce from '../hooks/useDebounce';
import toast from 'react-hot-toast';

export default function WatchlistPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { symbols, quotes, loading } = useSelector((s) => s.watchlist);
  const { searchResults, loadingMap } = useSelector((s) => s.stocks);
  const { items: alerts, loading: alertsLoading } = useSelector((s) => s.alerts);

  const [addQuery, setAddQuery] = useState('');
  const debounced               = useDebounce(addQuery, 400);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => { 
    dispatch(fetchWatchlist()); 
    dispatch(fetchAlerts());
  }, [dispatch]);

  useEffect(() => {
    if (debounced.trim().length >= 1) dispatch(searchStocks(debounced.trim()));
    else dispatch(clearSearch());
  }, [debounced, dispatch]);

  const handleAdd = async (symbol) => {
    const result = await dispatch(addToWatchlist(symbol));
    if (addToWatchlist.fulfilled.match(result)) {
      toast.success(`${symbol} added to watchlist`);
      setAddQuery(''); dispatch(clearSearch()); setShowSearch(false);
    } else {
      toast.error(result.payload || 'Failed to add');
    }
  };

  const handleRemove = async (symbol) => {
    await dispatch(removeFromWatchlist(symbol));
    toast.success(`${symbol} removed`);
  };

  const handleDeleteAlert = async (id) => {
    await dispatch(deleteAlert(id));
    toast.success('Alert deleted');
  };

  const handleToggleAlert = async (id) => {
    await dispatch(toggleAlert(id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--muted-foreground)' }}>My Tracking</p>
          <h1 className="font-display text-3xl md:text-4xl" style={{ color: 'var(--foreground)' }}>Watchlists & Alerts</h1>
        </div>
        <button
          onClick={() => setShowSearch((v) => !v)}
          className="h-9 px-3.5 flex items-center gap-1.5 rounded-md text-sm transition-all duration-150"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          <Plus className="h-4 w-4 stroke-[1.5]" />
          Add Stock
        </button>
      </div>

      {/* Add stock search panel */}
      {showSearch && (
        <div className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 stroke-[1.5]" style={{ color: 'var(--muted-foreground)' }} />
            <input
              autoFocus
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder="Search by symbol or company name…"
              className="w-full h-10 pl-9 pr-8 rounded-md text-sm"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none' }}
            />
            {addQuery && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => { setAddQuery(''); dispatch(clearSearch()); }}>
                <X className="h-3.5 w-3.5 stroke-[1.5]" style={{ color: 'var(--muted-foreground)' }} />
              </button>
            )}
          </div>

          {loadingMap.search && (
            <p className="text-xs px-1" style={{ color: 'var(--muted-foreground)' }}>Searching…</p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((r) => {
                const isIn = symbols.includes(r.symbol);
                return (
                  <div key={r.symbol} className="flex items-center justify-between p-2.5 rounded-md" style={{ backgroundColor: 'var(--background)' }}>
                    <div>
                      <span className="font-mono text-sm font-medium" style={{ color: 'var(--foreground)' }}>{r.symbol}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--muted-foreground)' }}>{r.name}</span>
                    </div>
                    <button
                      onClick={() => !isIn && handleAdd(r.symbol)}
                      disabled={isIn}
                      className="h-7 px-2.5 rounded text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: isIn ? 'oklch(0.78 0.16 152 / 0.1)' : 'var(--primary)',
                        color: isIn ? 'var(--primary)' : 'var(--primary-foreground)',
                        cursor: isIn ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isIn ? 'Added' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Watchlist */}
        <div className="space-y-4">
          <h2 className="font-sans font-medium text-lg" style={{ color: 'var(--foreground)' }}>My Watchlist</h2>
          <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          {['Symbol', 'Price', 'Change', ''].map((h, i) => (
            <p key={i} className={`text-xs uppercase tracking-[0.18em] ${i === 0 ? 'col-span-5' : i === 3 ? 'col-span-1' : 'col-span-3 text-right'}`} style={{ color: 'var(--muted-foreground)' }}>{h}</p>
          ))}
        </div>

        {loading ? (
          <div className="px-5">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : symbols.length === 0 ? (
          <EmptyState
            icon={Eye}
            title="Your watchlist is empty"
            description="Add stocks you want to track and monitor their live prices here."
          />
        ) : (
          symbols.map((sym) => {
            const q = quotes[sym] || {};
            return (
              <div
                key={sym}
                className="grid grid-cols-12 gap-4 items-center px-5 py-4 border-b last:border-0 cursor-pointer transition-colors duration-100"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => navigate(`/dashboard/stocks/${sym}`)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div className="col-span-5">
                  <p className="font-mono font-medium text-sm" style={{ color: 'var(--foreground)' }}>{sym}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{q.name || '—'}</p>
                </div>
                <p className="col-span-3 font-mono text-sm tabular-nums text-right" style={{ color: 'var(--foreground)' }}>
                  {q.price ? `₹${q.price.toFixed(2)}` : '—'}
                </p>
                <div className="col-span-3 flex justify-end">
                  <PriceChange change={q.change} changePercent={q.changePercent} showAbsolute />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(sym); }}
                    className="h-7 w-7 flex items-center justify-center rounded transition-colors"
                    style={{ color: 'var(--muted-foreground)' }}
                    onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.backgroundColor = 'oklch(0.66 0.22 22 / 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Trash2 className="h-4 w-4 stroke-[1.5]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
          </div>
        </div>

        {/* Right Side: Alerts */}
        <div className="space-y-4">
          <h2 className="font-sans font-medium text-lg" style={{ color: 'var(--foreground)' }}>Price Alerts</h2>
          
          <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              {['Symbol', 'Condition', 'Target', 'Status', ''].map((h, i) => (
                <p key={i} className={`text-xs uppercase tracking-[0.18em] ${i === 0 ? 'col-span-3' : i === 1 ? 'col-span-3' : i === 2 ? 'col-span-3 tabular-nums' : i === 3 ? 'col-span-2' : 'col-span-1 text-right'}`} style={{ color: 'var(--muted-foreground)' }}>{h}</p>
              ))}
            </div>

            {alertsLoading ? (
              <div className="px-5">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : alerts.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No active alerts"
                description="Set price alerts for your favorite stocks to never miss an opportunity."
              />
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert._id}
                  className="grid grid-cols-12 gap-4 items-center px-5 py-4 border-b last:border-0 transition-colors duration-100"
                  style={{ borderColor: 'var(--border)', backgroundColor: alert.isActive ? 'transparent' : 'oklch(0.16 0.012 250 / 0.5)' }}
                >
                  <div className="col-span-3">
                    <p className="font-mono font-medium text-sm" style={{ color: 'var(--foreground)' }}>{alert.symbol}</p>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: alert.condition === 'ABOVE' ? 'oklch(0.78 0.16 152 / 0.15)' : 'oklch(0.66 0.22 22 / 0.15)', color: alert.condition === 'ABOVE' ? 'var(--success)' : 'var(--destructive)' }}>
                      {alert.condition}
                    </span>
                  </div>
                  <p className="col-span-3 font-mono text-sm tabular-nums" style={{ color: 'var(--foreground)' }}>
                    ₹{alert.targetPrice.toFixed(2)}
                  </p>
                  <div className="col-span-2">
                    <button
                      onClick={() => handleToggleAlert(alert._id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${alert.isActive ? 'bg-primary' : 'bg-muted'}`}
                      style={{ backgroundColor: alert.isActive ? 'var(--primary)' : 'var(--muted)' }}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${alert.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => handleDeleteAlert(alert._id)}
                      className="h-7 w-7 flex items-center justify-center rounded transition-colors"
                      style={{ color: 'var(--muted-foreground)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.backgroundColor = 'oklch(0.66 0.22 22 / 0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Trash2 className="h-4 w-4 stroke-[1.5]" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
