import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllStocks, fetchStockDetail, fetchStockHistory } from '../store/slices/stockSlice';
import { addToWatchlist, removeFromWatchlist, fetchWatchlists } from '../store/slices/watchlistSlice';
import { tradeStock, fetchPortfolio } from '../store/slices/portfolioSlice';
import { createAlert } from '../store/slices/alertSlice';
import StockChart from '../components/stock/StockChart';
import PriceChange from '../components/stock/PriceChange';
import AiInsightCard from '../components/stock/AiInsightCard';
import Skeleton from '../components/ui/Skeleton';
import { Star, Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StocksPage() {
  const { symbol: routeSymbol } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { allStocks, loadingMap, currentStock, history, quotes, searchResults } = useSelector((s) => s.stocks);
  const { lists } = useSelector((s) => s.watchlist);
  const [resolution, setResolution] = useState('D');
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'overview'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [watchlistModalOpen, setWatchlistModalOpen] = useState(false);
  const [selectedWatchlists, setSelectedWatchlists] = useState({});

  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertCondition, setAlertCondition] = useState('ABOVE');
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [isTrading, setIsTrading] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState('BUY');

  // Fetch all stocks on mount if not available
  useEffect(() => {
    if (allStocks.length === 0) dispatch(fetchAllStocks());
    dispatch(fetchWatchlists());
    dispatch(fetchPortfolio());
  }, [dispatch, allStocks.length]);

  // Handle dynamic backend search
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const delayDebounceFn = setTimeout(() => {
        dispatch({ type: 'stocks/search/pending' }); // manual trigger for loading state if needed
        import('../store/slices/stockSlice').then(({ searchStocks }) => {
          dispatch(searchStocks(searchQuery));
        });
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      import('../store/slices/stockSlice').then(({ clearSearch }) => {
        dispatch(clearSearch());
      });
    }
  }, [searchQuery, dispatch]);

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

  // Use searchResults if typing, otherwise use the Top 50 default list
  const displayStocks = searchQuery.trim().length > 0 ? searchResults : allStocks;

  const watchlistsContainingSymbol = lists.filter(l => l.symbols.includes(activeSymbol));
  const isWatchlisted = watchlistsContainingSymbol.length > 0;

  const openWatchlistModal = () => {
    const initialSelected = {};
    lists.forEach(l => {
      initialSelected[l._id] = l.symbols.includes(activeSymbol);
    });
    setSelectedWatchlists(initialSelected);
    setWatchlistModalOpen(true);
  };

  const handleSaveWatchlists = async (e) => {
    e.preventDefault();
    let addCount = 0;
    let removeCount = 0;

    for (const list of lists) {
      const wasInList = list.symbols.includes(activeSymbol);
      const isNowSelected = selectedWatchlists[list._id];

      if (!wasInList && isNowSelected) {
        await dispatch(addToWatchlist({ listId: list._id, symbol: activeSymbol }));
        addCount++;
      } else if (wasInList && !isNowSelected) {
        await dispatch(removeFromWatchlist({ listId: list._id, symbol: activeSymbol }));
        removeCount++;
      }
    }

    if (addCount > 0 || removeCount > 0) {
      toast.success('Watchlists updated');
    }
    setWatchlistModalOpen(false);
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

  const initiateTrade = (type) => {
    if (tradeQuantity <= 0) return;
    setTradeType(type);
    setTradeModalOpen(true);
  };

  const confirmTrade = async (e) => {
    e.preventDefault();
    setIsTrading(true);
    const res = await dispatch(tradeStock({
      symbol: activeSymbol,
      name: profile?.name || liveQuote?.name,
      type: tradeType,
      quantity: tradeQuantity
    }));
    setIsTrading(false);
    setTradeModalOpen(false);
    
    if (tradeStock.fulfilled.match(res)) {
      toast.success(res.payload.message);
      setTradeQuantity(1);
    } else {
      toast.error(res.payload || 'Trade failed');
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
              {displayStocks.map((s) => {
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
                      <p className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                        {q.price ? `₹${q.price.toFixed(2)}` : '---'}
                      </p>
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
                  {!activeSymbol.startsWith('^') && (
                    <>
                      <input
                        type="number"
                        min="1"
                        value={tradeQuantity}
                        onChange={(e) => setTradeQuantity(Number(e.target.value))}
                        className="w-16 h-9 px-2 text-center rounded-md border text-sm"
                        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      />
                      <button
                        onClick={() => initiateTrade('BUY')}
                        disabled={isTrading}
                        className="h-9 px-4 rounded-md text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'var(--success, #22c55e)', color: 'white', opacity: isTrading ? 0.7 : 1 }}
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => initiateTrade('SELL')}
                        disabled={isTrading}
                        className="h-9 px-4 rounded-md text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'var(--destructive, #ef4444)', color: 'white', opacity: isTrading ? 0.7 : 1 }}
                      >
                        Sell
                      </button>
                      
                      <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--border)' }}></div>
                    </>
                  )}

                  <button
                    onClick={openWatchlistModal}
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
                  
                  <AiInsightCard symbol={activeSymbol} />

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

      {/* Watchlist Modal */}
      {watchlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'oklch(0 0 0 / 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-xl border shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-sans font-medium text-lg" style={{ color: 'var(--foreground)' }}>Save to Watchlist</h3>
              <button onClick={() => setWatchlistModalOpen(false)} className="opacity-70 hover:opacity-100 transition-opacity">
                <X className="h-5 w-5" style={{ color: 'var(--foreground)' }} />
              </button>
            </div>
            <form onSubmit={handleSaveWatchlists} className="p-4 space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2">
                {lists.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted-foreground)' }}>You don't have any watchlists yet. Create one from the Watchlists page.</p>
                ) : (
                  lists.map((list) => (
                    <label key={list._id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedWatchlists[list._id] || false}
                        onChange={(e) => setSelectedWatchlists({ ...selectedWatchlists, [list._id]: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{list.name}</span>
                    </label>
                  ))
                )}
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={lists.length === 0}
                  className="w-full h-10 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Trade Confirmation Modal */}
      {tradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'oklch(0 0 0 / 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-xl border shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-sans font-medium text-lg" style={{ color: 'var(--foreground)' }}>Confirm {tradeType}</h3>
              <button onClick={() => setTradeModalOpen(false)} disabled={isTrading} className="opacity-70 hover:opacity-100 transition-opacity">
                <X className="h-5 w-5" style={{ color: 'var(--foreground)' }} />
              </button>
            </div>
            <form onSubmit={confirmTrade} className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--muted-foreground)' }}>Stock</span>
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>{activeSymbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--muted-foreground)' }}>Quantity</span>
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>{tradeQuantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--muted-foreground)' }}>Current Price</span>
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>₹{liveQuote?.price?.toFixed(2) || '---'}</span>
                </div>
                <div className="pt-3 border-t flex justify-between font-medium" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  <span>Estimated Total</span>
                  <span>₹{liveQuote?.price ? (liveQuote.price * tradeQuantity).toFixed(2) : '---'}</span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setTradeModalOpen(false)}
                  disabled={isTrading}
                  className="flex-1 h-10 rounded-md text-sm font-medium transition-colors border"
                  style={{ backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTrading}
                  className="flex-1 h-10 rounded-md text-sm font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: tradeType === 'BUY' ? 'var(--success, #22c55e)' : 'var(--destructive, #ef4444)', color: 'white' }}
                >
                  {isTrading ? 'Processing...' : `Confirm ${tradeType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
