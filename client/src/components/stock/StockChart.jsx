import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';

const RESOLUTIONS = [
  { label: '1m',  value: '1'  },
  { label: '30m', value: '30' },
  { label: 'D',   value: 'D'  },
  { label: 'W',   value: 'W'  },
  { label: 'M',   value: 'M'  },
];

const StockChart = ({ candles = [], resolution = 'D', onResolutionChange, loading }) => {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);

  // Initialise chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = createChart(containerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor:  '#94a3b8',
        fontSize:   11,
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 380,
    });

    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor:        '#10b981',
      downColor:      '#ef4444',
      borderUpColor:  '#10b981',
      borderDownColor:'#ef4444',
      wickUpColor:    '#10b981',
      wickDownColor:  '#ef4444',
    });

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ 
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.remove();
    };
  }, []);

  // Update data when candles change
  useEffect(() => {
    if (!seriesRef.current || !candles?.length) return;
    seriesRef.current.setData(candles);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div className="flex flex-col flex-1 h-full rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted-foreground)' }}>
          Price Chart
        </p>
        <div className="flex items-center gap-1">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => onResolutionChange?.(r.value)}
              className="h-7 px-2.5 rounded text-xs font-mono transition-colors duration-150"
              style={{
                backgroundColor: resolution === r.value ? 'var(--primary)' : 'transparent',
                color:           resolution === r.value ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: 'oklch(0.19 0.014 250 / 0.8)' }}>
            <div className="h-6 w-6 border-2 border-muted border-t-primary rounded-full animate-spin"
                 style={{ borderColor: 'var(--muted)', borderTopColor: 'var(--primary)' }} />
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
};

export default StockChart;
