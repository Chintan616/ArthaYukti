import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, FileText, LineChart, Zap, TrendingUp, Shield, Activity, Brain } from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

export default function LandingPage() {
  // Live chart continuous scrolling animation
  const [chartData, setChartData] = useState(() => {
    let initial = [80];
    for (let i = 1; i < 15; i++) {
      initial.push(Math.max(10, Math.min(110, initial[i-1] + (Math.random() * 20 - 10))));
    }
    return initial;
  });
  
  const [offset, setOffset] = useState(0);
  const POINT_SPACING = 40;

  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    const SCROLL_SPEED = 30; // pixels per second

    const render = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      setOffset((prevOffset) => {
        const newOffset = prevOffset + (SCROLL_SPEED * delta);
        if (newOffset >= POINT_SPACING) {
          // Time to shift the array
          setChartData(prev => {
            const next = [...prev.slice(1)];
            const last = next[next.length - 1];
            let nextVal = last + (Math.random() * 20 - 10);
            if (nextVal < 10) nextVal = 10;
            if (nextVal > 110) nextVal = 110;
            next.push(nextVal);
            return next;
          });
          return newOffset - POINT_SPACING;
        }
        return newOffset;
      });
      animationFrameId = requestAnimationFrame(render);
    };
    
    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Generate path based on offset
  const pathD = `M ${-offset} ${chartData[0]} ` + chartData.slice(1).map((y, i) => `L ${((i + 1) * POINT_SPACING) - offset} ${y}`).join(' ');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <LineChart className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display text-2xl tracking-tight">Artha<span className="font-sans font-medium text-primary">युक्ति</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Log In
            </Link>
            <Link 
              to="/register" 
              className="text-sm font-medium px-4 py-2 rounded-md transition-colors"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border w-fit" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="uppercase tracking-widest text-[10px] font-bold">Intelligence Behind Every Trade</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl lg:text-7xl font-display tracking-tight leading-[1.1]">
              Master the Indian Markets with <span className="text-primary">AI Intelligence.</span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-lg leading-relaxed max-w-xl text-muted-foreground">
              Experience institutional-grade analytics, 30-day Machine Learning forecasting, and zero-risk paper trading — all in one beautifully designed platform.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex items-center gap-4 pt-4">
              <Link 
                to="/register" 
                className="h-12 px-6 rounded-md font-medium flex items-center gap-2 transition-transform hover:scale-105"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Start Trading for Free <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Terminal Style Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: 50, rotateY: 15, rotateX: 5 }} 
            animate={{ opacity: 1, x: 0, rotateY: -5, rotateX: 5 }} 
            transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 50 }}
            className="relative w-full max-w-xl mx-auto lg:ml-auto perspective-1000"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
            
            {/* Terminal Card */}
            <div className="relative w-full rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden bg-[#0c0f12] text-[#94a3b8] font-mono">
              
              {/* Top Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 text-[10px] tracking-widest uppercase">
                <div className="flex items-center gap-2.5">
                  <motion.div 
                    className="h-2 w-2 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ boxShadow: '0 0 8px var(--primary)' }}
                  />
                  <span>ARTHAYUKTI · TERMINAL v2.4</span>
                </div>
                <span>14:32:08 IST</span>
              </div>

              {/* Main Body */}
              <div className="flex flex-col sm:flex-row h-auto sm:h-[280px]">
                
                {/* Left Panel: Chart & Trade Info */}
                <div className="flex-1 flex flex-col p-5 border-b sm:border-b-0 sm:border-r border-white/10">
                  {/* Chart Header */}
                  <div className="flex items-center justify-between text-xs mb-4">
                    <span>NIFTY50 · 1D</span>
                    <span className="text-primary font-medium">SIGNAL: BULLISH 0.92</span>
                  </div>

                  {/* SVG Chart Area */}
                  <div className="flex-1 relative w-full mb-4">
                    <svg viewBox="0 0 400 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="termGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={`${pathD} L 400 120 L 0 120 Z`}
                        fill="url(#termGradient)"
                      />
                      <path
                        d={pathD}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        style={{ filter: 'drop-shadow(0px 0px 4px var(--primary))' }}
                      />
                    </svg>
                  </div>

                  {/* Trade Details */}
                  <div className="flex items-center justify-between text-[11px] pt-2">
                    <div>
                      <div className="text-white/40 mb-1">Entry</div>
                      <div className="text-white font-medium">23,410.50</div>
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Target</div>
                      <div className="text-primary font-medium">24,200.00</div>
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Stop</div>
                      <div className="text-red-500 font-medium">23,100.00</div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Live Signals */}
                <div className="w-full sm:w-[180px] p-5 flex flex-col text-xs">
                  <div className="text-white/40 mb-6 uppercase tracking-widest text-[10px]">Signals · Live</div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span>RELIANCE</span>
                      <span className="text-primary flex items-center gap-1">↗ LONG</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>HDFCBANK</span>
                      <span className="text-primary flex items-center gap-1">↗ LONG</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>TCS</span>
                      <span className="text-red-500 flex items-center gap-1">↘ SHORT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>INFY</span>
                      <span className="text-primary flex items-center gap-1">↗ LONG</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>ITC</span>
                      <span className="text-red-500 flex items-center gap-1">↘ SHORT</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Metrics Bar */}
      <div className="border-y" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--border)' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="flex flex-col items-center gap-2">
            <span className="text-4xl font-bold tracking-tighter">₹1,000,000</span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Virtual Starting Cash</span>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="flex flex-col items-center gap-2">
            <span className="text-4xl font-bold tracking-tighter text-primary">Live</span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">NSE/BSE Data Feeds</span>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="flex flex-col items-center gap-2">
            <span className="text-4xl font-bold tracking-tighter">30-Day</span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">ML Forecasting</span>
          </motion.div>
        </div>
      </div>

      {/* Bento Box Features */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display mb-4 tracking-tight">Your Personal AI Desk</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Don't trade alone. ArthaYukti gives you access to <span className="text-primary text-xl md:text-2xl font-bold tracking-tight mx-1">3 specialized AI agents</span>, combined with a zero-risk paper trading engine.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-[300px] gap-6">
          {/* Card 1: AI Co-Pilot (Large) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="md:col-span-2 md:row-span-2 rounded-2xl border border-border bg-surface p-8 flex flex-col relative overflow-hidden group hover:border-primary transition-colors duration-300"
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
            <Bot className="h-10 w-10 text-primary mb-6" />
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">Agent 1</span>
            </div>
            <h3 className="text-3xl font-bold mb-3 tracking-tight">The Co-Pilot</h3>
            <p className="text-muted-foreground text-lg max-w-md">
              Chat with your portfolio. Our context-aware AI reads your watchlists, fetches live news sentiment, and runs mathematical forecasts to give you personalized guidance.
            </p>
            
            <div className="mt-auto flex flex-col gap-4 w-full">
              {/* Question 1 */}
              <div className="flex gap-3">
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-none text-sm w-fit border border-border shadow-sm">
                  What's the 30-day forecast for TCS?
                </div>
              </div>
              {/* Answer 1 */}
              <div className="flex gap-3 justify-end">
                <div className="bg-primary/20 text-foreground px-4 py-3 rounded-2xl rounded-br-none text-sm w-fit border border-primary/30 shadow-sm max-w-[85%]">
                  Based on Holt-Winters Exponential Smoothing, TCS shows a bullish upside of 4.2% over the next 30 days.
                </div>
              </div>
              {/* Question 2 */}
              <div className="flex gap-3">
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-none text-sm w-fit border border-border shadow-sm">
                  Any news on Reliance today?
                </div>
              </div>
              {/* Answer 2 */}
              <div className="flex gap-3 justify-end">
                <div className="bg-primary/20 text-foreground px-4 py-3 rounded-2xl rounded-br-none text-sm w-fit border border-primary/30 shadow-sm max-w-[85%]">
                  Yes, sentiment is highly positive. They just announced a major green energy initiative in Gujarat.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: PDF Reports */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="rounded-2xl border border-border bg-surface p-8 flex flex-col justify-between hover:border-primary transition-colors duration-300"
          >
            <div>
              <Brain className="h-8 w-8 text-primary mb-4" />
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">Agent 2</span>
              </div>
              <h3 className="text-xl font-bold mb-2">The Quant Analyst</h3>
              <p className="text-sm text-muted-foreground">Runs complex ML models like Holt-Winters forecasting and generates institutional-grade PDF reports.</p>
            </div>
          </motion.div>

          {/* Card 3: Seamless Paper Trading */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="rounded-2xl border border-border bg-surface p-8 flex flex-col justify-between hover:border-primary transition-colors duration-300"
          >
            <div>
              <TrendingUp className="h-8 w-8 text-primary mb-4" />
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">Core Engine</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Paper Trading</h3>
              <p className="text-sm text-muted-foreground">Execute virtual buy and sell orders in real-time. Test your strategies without risking real capital.</p>
            </div>
          </motion.div>

          {/* Card 4: Smart Insights (Wide) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="md:col-span-3 rounded-2xl border border-border bg-surface p-8 flex flex-col md:flex-row items-center gap-8 justify-between hover:border-primary transition-colors duration-300"
          >
            <div className="max-w-xl">
              <Shield className="h-8 w-8 text-primary mb-4" />
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">Agent 3</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">The Risk Manager</h3>
              <p className="text-muted-foreground">
                Instantly understand any stock's momentum. The Risk Manager analyzes moving averages, valuation, and news sentiment to give you a clear Bullish or Bearish verdict.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-green-500/20 text-green-500 border border-green-500/30 rounded text-sm font-bold">BULLISH</span>
              <span className="px-3 py-1 bg-red-500/20 text-red-500 border border-red-500/30 rounded text-sm font-bold">BEARISH</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display mb-4 tracking-tight">How It Works</h2>
            <p className="text-muted-foreground">Go from novice to quantitative analyst in three simple steps.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">1</div>
              <h3 className="text-xl font-bold">Create Account</h3>
              <p className="text-sm text-muted-foreground">Sign up in seconds and instantly receive ₹10,00,000 in virtual trading capital.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-4 relative">
              <div className="hidden md:block absolute top-8 -left-[20%] w-[40%] border-t-2 border-dashed border-border" />
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary relative z-10">2</div>
              <h3 className="text-xl font-bold">Consult the AI</h3>
              <p className="text-sm text-muted-foreground">Generate comprehensive stock reports and let the ML forecast model analyze trends.</p>
              <div className="hidden md:block absolute top-8 -right-[20%] w-[40%] border-t-2 border-dashed border-border" />
            </div>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">3</div>
              <h3 className="text-xl font-bold">Execute Trades</h3>
              <p className="text-sm text-muted-foreground">Build your paper portfolio in real-time, track P&L, and refine your strategies.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t text-center md:text-left" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            <span className="font-display text-2xl tracking-tight">Artha<span className="font-sans font-medium text-primary">युक्ति</span></span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 ArthaYukti. Intelligence Behind Every Trade.
          </p>
        </div>
      </footer>
    </div>
  );
}
