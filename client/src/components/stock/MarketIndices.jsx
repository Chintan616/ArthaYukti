import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Settings, Check, X } from 'lucide-react';
import { fetchIndices } from '../../store/slices/stockSlice';

const DEFAULT_INDICES = ['^BSESN', '^NSEI', '^NSEBANK'];

export default function MarketIndices() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { indices, loadingMap, quotes } = useSelector((s) => s.stocks);
  const [selectedSymbols, setSelectedSymbols] = useState(DEFAULT_INDICES);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchIndices());
    const saved = localStorage.getItem('selectedIndices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setSelectedSymbols(parsed);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [dispatch]);

  const toggleSelection = (symbol) => {
    setSelectedSymbols((prev) => {
      if (prev.includes(symbol)) {
        // Must have 3 selected, so don't allow unselecting if exactly 3 (or do allow, but we need 3 to look good)
        // Actually allow unselecting, just cap at 3
        return prev.filter(s => s !== symbol);
      } else {
        if (prev.length >= 3) return prev;
        return [...prev, symbol];
      }
    });
  };

  const saveSelection = () => {
    if (selectedSymbols.length !== 3) return;
    localStorage.setItem('selectedIndices', JSON.stringify(selectedSymbols));
    setIsModalOpen(false);
  };

  // Use live quote if available
  const liveQuote = (idx) => quotes[idx.symbol] ?? idx;

  const displayIndices = indices.filter(idx => selectedSymbols.includes(idx.symbol));

  if (loadingMap.indices && indices.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mt-6 mb-3">
        <h2 className="font-sans font-medium text-sm" style={{ color: 'var(--foreground)' }}>Market Indices</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-1 rounded-md transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {displayIndices.map((idx) => {
          const q = liveQuote(idx);
          const isPos = q.change >= 0;
          return (
            <button 
              key={q.symbol}
              onClick={() => navigate(`/dashboard/stocks/${encodeURIComponent(q.symbol)}`)}
              className="flex flex-col justify-center rounded-lg border p-4 text-left transition-colors" 
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface)')}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{q.name}</span>
                <span className="font-mono text-sm tabular-nums" style={{ color: 'var(--foreground)' }}>₹{q.price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-end w-full mt-1 font-mono tabular-nums text-xs" style={{ color: isPos ? 'var(--success)' : 'var(--destructive)' }}>
                <span>{isPos ? '+' : ''}{q.change?.toFixed(2)}</span>
                <span className="ml-2">({isPos ? '+' : ''}{q.changePercent?.toFixed(2)}%)</span>
              </div>
            </button>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-sm rounded-xl border shadow-2xl p-5"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>Select 3 Indices</h3>
              <button onClick={() => {
                const saved = localStorage.getItem('selectedIndices');
                setSelectedSymbols(saved ? JSON.parse(saved) : DEFAULT_INDICES);
                setIsModalOpen(false);
              }}>
                <X className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
              </button>
            </div>
            
            <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Choose up to 3 indices to display on your dashboard. ({selectedSymbols.length}/3 selected)
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide mb-4">
              {indices.map(idx => {
                const isSelected = selectedSymbols.includes(idx.symbol);
                const disabled = !isSelected && selectedSymbols.length >= 3;
                return (
                  <button
                    key={idx.symbol}
                    disabled={disabled}
                    onClick={() => toggleSelection(idx.symbol)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ 
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: isSelected ? 'oklch(0.78 0.16 152 / 0.1)' : 'transparent'
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{idx.name}</span>
                    {isSelected && <Check className="h-4 w-4" style={{ color: 'var(--primary)' }} />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={saveSelection}
              disabled={selectedSymbols.length !== 3}
              className="w-full h-10 rounded-md font-medium text-sm transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
