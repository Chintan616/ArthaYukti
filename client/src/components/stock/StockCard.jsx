import { useNavigate } from 'react-router-dom';
import PriceChange from './PriceChange';

const StockCard = ({ symbol, name, price, change, changePercent }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/dashboard/stocks/${symbol}`)}
      className="w-full text-left rounded-lg border p-4 transition-colors duration-150"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
        e.currentTarget.style.borderColor = 'oklch(0.36 0.014 250)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--surface)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono font-medium text-sm" style={{ color: 'var(--foreground)' }}>{symbol}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{name}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono text-sm tabular-nums" style={{ color: 'var(--foreground)' }}>
            ₹{price?.toFixed(2) ?? '—'}
          </p>
          <PriceChange change={change} changePercent={changePercent} />
        </div>
      </div>
    </button>
  );
};

export default StockCard;
