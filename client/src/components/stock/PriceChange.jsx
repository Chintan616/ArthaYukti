import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const PriceChange = ({ change, changePercent, showAbsolute = false, className = '' }) => {
  const isUp      = change > 0;
  const isDown    = change < 0;
  const isFlat    = !isUp && !isDown;
  const color     = isUp ? 'var(--primary)' : isDown ? 'var(--destructive)' : 'var(--muted-foreground)';
  const Icon      = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  return (
    <div className={`flex items-center gap-0.5 font-mono tabular-nums text-xs ${className}`} style={{ color }}>
      <Icon className="h-3 w-3 stroke-[2] flex-shrink-0" />
      {showAbsolute && <span>{Math.abs(change ?? 0).toFixed(2)} </span>}
      <span>{isFlat ? '0.00' : Math.abs(changePercent ?? 0).toFixed(2)}%</span>
    </div>
  );
};

export default PriceChange;
