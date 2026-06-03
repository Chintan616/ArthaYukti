import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { BarChart2, TrendingUp } from 'lucide-react';

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
  
  const [chartType, setChartType] = useState('candle'); // 'candle' | 'area'

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

  // Recreate series when chartType changes, and update data
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Remove old series if exists
    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    // Add new series
    if (chartType === 'candle') {
      seriesRef.current = chartRef.current.addCandlestickSeries({
        upColor:        '#10b981',
        downColor:      '#ef4444',
        borderUpColor:  '#10b981',
        borderDownColor:'#ef4444',
        wickUpColor:    '#10b981',
        wickDownColor:  '#ef4444',
      });
    } else {
      seriesRef.current = chartRef.current.addAreaSeries({
        lineColor: '#3b82f6',
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
      });
    }

    if (candles?.length) {
      const data = chartType === 'candle' 
        ? candles 
        : candles.map(c => ({ time: c.time, value: c.close }));
      seriesRef.current.setData(data);
      chartRef.current.timeScale().fitContent();
    }
  }, [chartType, candles]);

  return (
    <div className="flex flex-col flex-1 h-full rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted-foreground)' }}>
            Price Chart
          </p>
          <div className="flex items-center gap-1 bg-black/20 rounded p-0.5">
            <button
              onClick={() => setChartType('candle')}
              className={`p-1 rounded transition-colors ${chartType === 'candle' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Candlestick Chart"
            >
              <BarChart2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`p-1 rounded transition-colors ${chartType === 'area' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Area Chart"
            >
              <TrendingUp className="h-4 w-4" />
            </button>
          </div>
        </div>
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
