import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Copy, Check, FileText, Loader2, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStockHistory } from '../../store/slices/stockSlice';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ─── Phase config ─────────────────────────────────────────────────────────────

const PHASES = [
  { id: 1, label: 'Gathering fundamental data & news'     },
  { id: 2, label: 'Calculating technical indicators'      },
  { id: 3, label: 'Synthesizing AI report'                },
  { id: 4, label: 'Report generated'                      },
];

// ─── Markdown components ──────────────────────────────────────────────────────

const mdComponents = {
  h2: ({ children }) => (
    <h2 className="font-sans font-semibold text-base mt-6 mb-2 pb-1.5 border-b"
      style={{ color: 'var(--foreground)', borderColor: 'var(--border)' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-sans font-semibold text-sm mt-4 mb-1.5"
      style={{ color: 'var(--foreground)' }}>
      {children}
    </h3>
  ),
  p:  ({ children }) => (
    <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted-foreground)' }}>
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{children}</strong>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  li: ({ children }) => (
    <li className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
      {children}
    </li>
  ),
  hr: () => <hr className="my-4" style={{ borderColor: 'var(--border)' }} />,
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportModal({ symbol, companyName, onClose }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseMessage, setPhaseMessage] = useState('');
  const [report,       setReport]       = useState('');
  const [error,        setError]        = useState(null);
  const [done,         setDone]         = useState(false);
  const [copied,       setCopied]       = useState(false);

  const bottomRef   = useRef(null);
  const abortRef    = useRef(null);
  const reportRef   = useRef(null);

  const dispatch = useDispatch();
  const historyData = useSelector(s => s.stocks.history[`${symbol}:D`]);
  const [predictionData, setPredictionData] = useState(null);

  useEffect(() => {
    dispatch(fetchStockHistory({ symbol, resolution: 'D' }));
    
    // Fetch ML Prediction
    const token = localStorage.getItem('ay_token');
    fetch(`/ai-api/predict/${encodeURIComponent(symbol)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data && data.forecast) {
          setPredictionData(data.forecast);
        }
      })
      .catch(e => console.error("Failed to fetch prediction:", e));
  }, [dispatch, symbol]);

  // Combine historical data and prediction data for the chart
  const combinedChartData = useMemo(() => {
    if (!historyData) return [];
    const base = [...historyData];
    if (predictionData && predictionData.length > 0) {
      // Find the last close price to connect the line seamlessly
      const lastHist = base[base.length - 1];
      if (lastHist) {
        // We ensure the prediction line starts at the last known close
        const connectedPrediction = [
          { time: lastHist.time, predicted_close: lastHist.close },
          ...predictionData.map(d => ({
            time: d.time,
            predicted_close: d.close,
            lower: d.lower,
            upper: d.upper
          }))
        ];
        return [...base, ...connectedPrediction];
      }
    }
    return base;
  }, [historyData, predictionData]);

  // Auto-scroll as report streams in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [report]);

  // Start SSE stream on mount
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const token = localStorage.getItem('ay_token');
    const url   = `/ai-api/report/generate?symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(companyName)}`;

    (async () => {
      try {
        const res = await fetch(url, {
          signal:  controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep any incomplete line

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;

            try {
              const event = JSON.parse(raw);

              if (event.type === 'progress') {
                setCurrentPhase(event.phase);
                setPhaseMessage(event.message);
              } else if (event.type === 'chunk') {
                setCurrentPhase(4);
                setReport(prev => prev + event.content);
              } else if (event.type === 'done') {
                setDone(true);
              } else if (event.type === 'error') {
                setError(event.message);
              }
            } catch (_) {}
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message);
      }
    })();

    return () => controller.abort();
  }, [symbol, companyName]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `${symbol}_AI_Report`
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'oklch(0 0 0 / 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            <div>
              <h2 className="font-sans font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                AI Investment Report
              </h2>
              <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                {symbol} — {companyName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {done && report && (
              <>
                <button
                  onClick={handleCopy}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-md text-xs transition-colors"
                  style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  {copied
                    ? <><Check className="h-3.5 w-3.5" /> Copied</>
                    : <><Copy  className="h-3.5 w-3.5" /> Copy</>
                  }
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-md text-xs transition-colors"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
              </>
            )}
            <button
              onClick={() => { abortRef.current?.abort(); onClose(); }}
              className="h-8 w-8 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--muted)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Phase progress */}
        {!done && (
          <div className="px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              {PHASES.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 flex-1">
                  <div
                    className="h-1.5 flex-1 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: currentPhase >= p.id
                        ? 'var(--primary)'
                        : 'var(--muted)',
                    }}
                  />
                </div>
              ))}
            </div>
            {phaseMessage && (
              <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
                <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                {phaseMessage}
              </p>
            )}
          </div>
        )}

        {/* Report content */}
        <div 
          className="flex-1 overflow-y-auto px-6 py-5" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`
            .flex-1::-webkit-scrollbar {
              display: none;
            }
            @media print {
              @page { margin: 20mm; }
              body { background: white !important; }
              .report-print-container {
                background-color: white !important;
                padding: 0 !important;
              }
              .report-print-container * {
                color: #111827 !important;
              }
              .report-print-container p, .report-print-container li {
                color: #374151 !important;
                font-size: 11pt !important;
                line-height: 1.6 !important;
              }
              .report-print-container h2 {
                color: #111827 !important;
                border-bottom: 1px solid #d1d5db !important;
                margin-top: 24pt !important;
                padding-bottom: 4pt !important;
                font-size: 14pt !important;
              }
              .report-print-container h3 {
                color: #111827 !important;
                margin-top: 16pt !important;
                font-size: 12pt !important;
              }
              .report-print-container hr {
                border-color: #e5e7eb !important;
              }
              .print-header {
                display: block !important;
                text-align: center;
                margin-bottom: 24pt;
                padding-bottom: 12pt;
                border-bottom: 2px solid #111827;
              }
              .print-header h1 {
                font-size: 20pt !important;
                font-weight: 700 !important;
                margin: 0 !important;
                color: #111827 !important;
                font-family: serif;
              }
              .print-header p {
                font-size: 10pt !important;
                color: #6b7280 !important;
                margin: 4pt 0 0 0 !important;
                font-family: monospace;
              }
            }
          `}</style>
          <div ref={reportRef} className="report-print-container">
            <div className="hidden print-header">
              <h1>ArthaYukti AI Investment Report</h1>
              <p>{symbol} — {companyName} | Generated on {new Date().toLocaleDateString()}</p>
            </div>
            
            {combinedChartData && combinedChartData.length > 0 && done && (
              <div className="mb-6 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-sans font-semibold text-lg text-center w-full" style={{ color: 'var(--foreground)' }}>
                    6-Month Price History & AI Forecast
                  </h2>
                </div>
                <div className="w-full flex justify-center mb-2">
                  {predictionData && (
                    <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                      30-Day ML Forecast Active
                    </span>
                  )}
                </div>
                <div className="w-full mt-4" style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={combinedChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={(val) => {
                          const d = new Date(val * 1000);
                          return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                        }}
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={30}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `₹${val}`}
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '0.5rem', fontSize: '12px' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        labelFormatter={(label) => new Date(label * 1000).toLocaleDateString()}
                        formatter={(value, name) => {
                          if (name === 'close') return [`₹${value.toFixed(2)}`, 'Historical Price'];
                          if (name === 'predicted_close') return [`₹${value.toFixed(2)}`, 'Predicted Price'];
                          if (name === 'upper') return [`₹${value.toFixed(2)}`, 'Upper Bound'];
                          if (name === 'lower') return [`₹${value.toFixed(2)}`, 'Lower Bound'];
                          return [value, name];
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                        payload={[
                          { value: 'Historical Price', type: 'line', id: 'hist', color: 'var(--primary)' },
                          { value: 'AI Expected Price', type: 'plainline', id: 'pred', color: '#8b5cf6', strokeDasharray: '5 5' },
                          { value: 'Prediction Bounds (High/Low)', type: 'rect', id: 'bounds', color: 'rgba(139, 92, 246, 0.2)' }
                        ]}
                      />
                      <Area type="monotone" dataKey="close" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                      {predictionData && (
                        <>
                          <Area type="monotone" dataKey="predicted_close" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPredicted)" />
                          <Area type="monotone" dataKey="upper" stroke="transparent" fill="#8b5cf6" fillOpacity={0.1} />
                          <Area type="monotone" dataKey="lower" stroke="transparent" fill="#8b5cf6" fillOpacity={0.1} />
                        </>
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {error ? (
            <p className="text-sm" style={{ color: 'var(--destructive)' }}>
              Error: {error}
            </p>
          ) : report ? (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {report}
              </ReactMarkdown>
              {!done && (
                <span className="inline-block h-4 w-0.5 ml-0.5 animate-pulse"
                  style={{ backgroundColor: 'var(--primary)' }} />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--primary)' }} />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {phaseMessage || 'Starting analysis…'}
              </p>
            </div>
          )}
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
