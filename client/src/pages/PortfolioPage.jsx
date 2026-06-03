import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { fetchPortfolioSummary, fetchPortfolioChart } from '../store/slices/portfolioSlice';
import PriceChange from '../components/stock/PriceChange';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

const PIE_COLORS = [
  'oklch(0.78 0.16 152)',
  'oklch(0.7 0.14 220)',
  'oklch(0.8 0.14 80)',
  'oklch(0.6 0.12 300)',
  'oklch(0.66 0.22 22)',
  'oklch(0.72 0.16 180)',
];

const StatCard = ({ label, value, sub, isGreen }) => (
  <div className="rounded-lg border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
    <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
    <p className="font-mono text-2xl tabular-nums" style={{ color: 'var(--foreground)' }}>{value}</p>
    {sub !== undefined && (
      <p className="font-mono text-xs tabular-nums mt-1" style={{ color: isGreen === true ? 'var(--primary)' : isGreen === false ? 'var(--destructive)' : 'var(--muted-foreground)' }}>
        {sub}
      </p>
    )}
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border px-3 py-2 text-xs" style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}>
      <p className="font-mono font-medium" style={{ color: 'var(--foreground)' }}>{payload[0].name}</p>
      <p style={{ color: 'var(--muted-foreground)' }}>{payload[0].value?.toFixed(2)}%</p>
    </div>
  );
};

export default function PortfolioPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { summary, holdings, loading, chartData, chartLoading } = useSelector((s) => s.portfolio);

  useEffect(() => {
    // Initial fetch
    dispatch(fetchPortfolioSummary());
    dispatch(fetchPortfolioChart());
  }, [dispatch]);

  const totalHoldingsValue = summary?.totalValue ?? 0;
  const pieData = holdings.map((h) => ({
    name:  h.symbol,
    value: totalHoldingsValue > 0 ? ((h.currentValue / totalHoldingsValue) * 100) : 0,
  }));

  const fmt = (n) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '0.00';

  const handleDownloadPortfolio = () => {
    if (!holdings || holdings.length === 0) {
      toast.error('No holdings to download');
      return;
    }
    const headers = ['Symbol', 'Name', 'Quantity', 'Avg Price', 'Current Price', 'P&L', 'P&L %'];
    const csvContent = [
      headers.join(','),
      ...holdings.map(h => [
        h.symbol,
        `"${h.name}"`,
        h.quantity,
        h.avgPrice?.toFixed(2),
        h.currentPrice?.toFixed(2),
        h.pl?.toFixed(2),
        h.plPercent?.toFixed(2)
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'portfolio_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--muted-foreground)' }}>My Investments</p>
          <h1 className="font-display text-3xl md:text-4xl" style={{ color: 'var(--foreground)' }}>Portfolio</h1>
        </div>
        <button
          onClick={handleDownloadPortfolio}
          className="h-9 px-3 flex items-center gap-2 rounded-md font-medium text-xs transition-colors duration-150"
          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-5 space-y-2" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Value"   value={`₹${fmt(summary?.totalValue)}`} />
          <StatCard label="Invested"      value={`₹${fmt(summary?.totalCost)}`} />
          <StatCard
            label="Overall P&L"
            value={`₹${fmt(Math.abs(summary?.totalPL ?? 0))}`}
            sub={`${(summary?.totalPLPercent ?? 0) >= 0 ? '+' : ''}${summary?.totalPLPercent?.toFixed(2)}%`}
            isGreen={(summary?.totalPL ?? 0) >= 0}
          />
          <StatCard
            label="Today's P&L"
            value={`₹${fmt(Math.abs(summary?.todayPL ?? 0))}`}
            sub={(summary?.todayPL ?? 0) >= 0 ? 'Profit' : 'Loss'}
            isGreen={(summary?.todayPL ?? 0) >= 0}
          />
          <StatCard label="Paper Cash"    value={`₹${fmt(summary?.virtualBalance)}`} sub="Available to trade" />
        </div>
      )}

      {/* Portfolio Historical Chart */}
      <div className="rounded-lg border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="font-sans font-medium text-sm mb-4" style={{ color: 'var(--foreground)' }}>Portfolio Value (30D)</h2>
        {chartLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                  }}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `₹${(val/1000).toFixed(1)}k`}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '0.5rem' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px' }}
                  formatter={(value) => [`₹${value.toFixed(2)}`, 'Value']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>No historical data available</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Holdings table */}
        <div className="lg:col-span-2 rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-sans font-medium text-sm" style={{ color: 'var(--foreground)' }}>Holdings</h2>
          </div>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-12 px-5 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            {['Stock', 'Qty', 'Avg', 'Current', 'P&L'].map((h, i) => (
              <p key={h} className={`text-xs uppercase tracking-[0.18em] ${i === 0 ? 'col-span-3' : 'col-span-2 text-right'} ${i === 4 ? 'col-span-3' : ''}`} style={{ color: 'var(--muted-foreground)' }}>{h}</p>
            ))}
          </div>

          {holdings.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No holdings yet"
              description="You have no transactions in your portfolio."
            />
          ) : (
            holdings.map((h) => {
              const plColor = h.pl >= 0 ? 'var(--primary)' : 'var(--destructive)';
              return (
                <div
                  key={h.symbol}
                  className="grid grid-cols-12 px-5 py-4 border-b last:border-0 items-center cursor-pointer transition-colors duration-100"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => navigate(`/dashboard/stocks/${h.symbol}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="col-span-3">
                    <p className="font-mono font-medium text-sm" style={{ color: 'var(--foreground)' }}>{h.symbol}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{h.name}</p>
                  </div>
                  <p className="col-span-2 font-mono text-sm tabular-nums text-right" style={{ color: 'var(--foreground)' }}>{h.quantity}</p>
                  <p className="col-span-2 font-mono text-sm tabular-nums text-right" style={{ color: 'var(--muted-foreground)' }}>₹{h.avgPrice?.toFixed(2)}</p>
                  <p className="col-span-2 font-mono text-sm tabular-nums text-right" style={{ color: 'var(--foreground)' }}>₹{h.currentPrice?.toFixed(2)}</p>
                  <div className="col-span-3 text-right">
                    <p className="font-mono text-sm tabular-nums" style={{ color: plColor }}>
                      {h.pl >= 0 ? '+' : ''}₹{Math.abs(h.pl).toFixed(2)}
                    </p>
                    <p className="font-mono text-xs tabular-nums" style={{ color: plColor }}>
                      {h.plPercent >= 0 ? '+' : ''}{h.plPercent?.toFixed(2)}%
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Allocation pie */}
        <div className="rounded-lg border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="font-sans font-medium text-sm mb-4" style={{ color: 'var(--foreground)' }}>Allocation</h2>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>No data yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{d.name}</span>
                    </div>
                    <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--muted-foreground)' }}>{d.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
