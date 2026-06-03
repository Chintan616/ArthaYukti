import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SendHorizonal, Sparkles, Bot, User, MessageSquare, Plus, Trash2, Menu, X } from 'lucide-react';

// ─── Suggested starter prompts ────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: 'Analyse my portfolio risk',       prompt: 'Analyse my current portfolio and tell me about its risk profile, diversification, and biggest P&L contributors.' },
  { label: 'Why is Reliance trending?',       prompt: 'Get the latest price and recent trend for RELIANCE and explain its current momentum.' },
  { label: 'Compare HDFC Bank vs ICICI Bank', prompt: 'Compare HDFCBANK and ICICIBANK — fetch both prices and recent trends, then give me a brief analysis of which looks stronger right now.' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────


const ThinkingDots = () => (
  <div className="flex items-end gap-3 max-w-3xl">
    <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, oklch(0.55 0.18 280), oklch(0.65 0.2 320))' }}>
      <Bot className="h-3.5 w-3.5 text-white" />
    </div>
    <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full animate-bounce"
          style={{ backgroundColor: 'var(--primary)', animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  </div>
);

const AiMessage = ({ content }) => {
  // ─── Markdown components — scoped to dark theme ──────────────────────────────
  const mdComponents = {
    p:          ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    strong:     ({ children }) => <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{children}</strong>,
    ul:         ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
    ol:         ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
    li:         ({ children }) => <li className="leading-relaxed">{children}</li>,
    h1:         ({ children }) => <h1 className="font-display text-lg mb-2 mt-1" style={{ color: 'var(--foreground)' }}>{children}</h1>,
    h2:         ({ children }) => <h2 className="font-sans font-semibold text-base mb-1.5 mt-1" style={{ color: 'var(--foreground)' }}>{children}</h2>,
    h3:         ({ children }) => <h3 className="font-sans font-medium text-sm mb-1 mt-1" style={{ color: 'var(--foreground)' }}>{children}</h3>,
    table:      ({ children }) => (
      <div className="overflow-x-auto mb-2">
        <table className="w-full text-xs border-collapse" style={{ borderColor: 'var(--border)' }}>{children}</table>
      </div>
    ),
    th:         ({ children }) => (
      <th className="text-left px-3 py-1.5 font-mono font-medium text-xs uppercase tracking-wider border" style={{ borderColor: 'var(--border)', backgroundColor: 'oklch(0.22 0.016 250)', color: 'var(--muted-foreground)' }}>
        {children}
      </th>
    ),
    td:         ({ children }) => (
      <td className="px-3 py-1.5 border font-mono" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
        {children}
      </td>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 pl-3 my-1 italic" style={{ borderColor: 'var(--primary)', color: 'var(--muted-foreground)' }}>
        {children}
      </blockquote>
    ),
    code:       ({ children }) => (
      <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'oklch(0.22 0.016 250)', color: 'var(--primary)' }}>
        {children}
      </code>
    )
  };

  return (
    <div className="flex items-end gap-3 max-w-3xl">
      <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 self-start mt-0.5"
        style={{ background: 'linear-gradient(135deg, oklch(0.55 0.18 280), oklch(0.65 0.2 320))' }}>
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed min-w-0"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

const UserMessage = ({ content }) => (
  <div className="flex items-end justify-end gap-3">
    <div className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[75%]"
      style={{ background: 'oklch(0.78 0.16 152 / 0.15)', border: '1px solid oklch(0.78 0.16 152 / 0.3)', color: 'var(--foreground)' }}>
      {content}
    </div>
    <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 self-start mt-0.5"
      style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.15)', color: 'var(--primary)' }}>
      <User className="h-3.5 w-3.5" />
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiAnalystPage() {
  const token = localStorage.getItem('ay_token');
  const user  = useSelector((s) => s.auth.user);

  const [threads,   setThreads]   = useState([]);
  const [activeId,  setActiveId]  = useState(null);
  
  const [messages,  setMessages]  = useState([]);   // { _id, role: 'human'|'ai', content }
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const msgCounter = useRef(0);
  const nextId = () => { msgCounter.current += 1; return msgCounter.current; };

  // Fetch threads on mount
  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    }
  };

  // Load a specific thread
  const loadThread = async (id) => {
    setActiveId(id);
    setSidebarOpen(false);
    try {
      const res = await fetch(`/api/chats/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch thread messages:", err);
    }
  };

  const createNewThread = () => {
    setActiveId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const deleteThread = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setThreads(prev => prev.filter(t => t._id !== id));
        if (activeId === id) {
          createNewThread();
        }
      }
    } catch (err) {
      console.error("Failed to delete thread:", err);
    }
  };

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);


  const sendMessage = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput('');

    const userMsg = { role: 'human', content: trimmed };
    setMessages((prev) => [...prev, { _id: nextId(), ...userMsg }]);
    setLoading(true);

    let currentChatId = activeId;

    try {
      // 1. Ensure a chat thread exists in Node.js
      if (!currentChatId) {
        // Create new thread
        const title = trimmed.length > 30 ? trimmed.substring(0, 30) + '...' : trimmed;
        const createRes = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, initialMessage: userMsg })
        });
        if (createRes.ok) {
          const newThread = await createRes.json();
          currentChatId = newThread._id;
          setActiveId(currentChatId);
          setThreads(prev => [newThread, ...prev]);
        }
      } else {
        // Append to existing thread in Node.js
        await fetch(`/api/chats/${currentChatId}/messages`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: userMsg })
        });
      }

      // 2. Call Python AI API
      const historyPayload = messages.map((m) => ({
        role:    m.role,
        content: m.content,
      }));

      const aiApiUrl = import.meta.env.VITE_AI_API_URL || '/ai-api';
      const aiRes = await fetch(`${aiApiUrl}/chat`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, chatHistory: historyPayload }),
      });

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({ detail: aiRes.statusText }));
        throw new Error(err.detail || `HTTP ${aiRes.status}`);
      }

      const reader = aiRes.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let aiContent = "";
      const aiMsgId = nextId();
      
      // Stop loading spinner, insert empty AI message immediately
      setLoading(false);
      setMessages((prev) => [...prev, { _id: aiMsgId, role: 'ai', content: '' }]);

      let buffer = "";
      let isDone = false;

      while (!isDone) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) isDone = true;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          // Keep the last chunk in the buffer if it's incomplete
          buffer = parts.pop() || "";
          
          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const dataStr = part.substring(6).trim();
              if (dataStr === '[DONE]') {
                isDone = true;
                break;
              }
              let parsed;
              try {
                parsed = JSON.parse(dataStr);
              } catch (e) {
                // Ignore incomplete chunks
              }
              
              if (parsed) {
                if (parsed.content) {
                  aiContent += parsed.content;
                  // Update UI with latest chunk
                  setMessages((prev) => 
                    prev.map(m => m._id === aiMsgId ? { ...m, content: aiContent } : m)
                  );
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              }
            }
          }
        }
      }

      const aiMsg = { role: 'ai', content: aiContent };

      // 3. Save AI response to Node.js DB
      if (currentChatId) {
        await fetch(`/api/chats/${currentChatId}/messages`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: aiMsg })
        });
      }

    } catch (err) {
      setError(err.message);
      setMessages((prev) => [...prev, {
        _id: nextId(), role: 'ai',
        content: `❌ **Error:** ${err.message}\n\nMake sure the AI service is running:\n\`\`\`\ncd ai-service && source venv/bin/activate && uvicorn main:app --reload --port 8000\n\`\`\``,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex relative -mx-6 md:-mx-8 -my-8 border-t" style={{ height: 'calc(100vh - 4rem)', borderColor: 'var(--border)' }}>
      
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setSidebarOpen(true)}
        className="md:hidden absolute top-2 left-2 z-10 p-2 rounded-md"
        style={{ color: 'var(--foreground)', backgroundColor: 'var(--surface)' }}>
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div 
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform absolute md:relative z-20 flex flex-col w-64 h-full border-r shrink-0`}
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        
        <div className="p-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
          <button 
            onClick={createNewThread}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            <Plus className="h-4 w-4" /> New Chat
          </button>
          
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-md ml-2"
            style={{ color: 'var(--muted-foreground)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 px-3 space-y-1">
          {threads.map((thread) => (
            <div 
              key={thread._id}
              onClick={() => loadThread(thread._id)}
              className="group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
              style={{ 
                backgroundColor: activeId === thread._id ? 'var(--surface)' : 'transparent',
                color: activeId === thread._id ? 'var(--foreground)' : 'var(--muted-foreground)'
              }}>
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate font-medium">{thread.title}</span>
              </div>
              <button 
                onClick={(e) => deleteThread(thread._id, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {threads.length === 0 && (
            <p className="text-xs text-center mt-4" style={{ color: 'var(--muted-foreground)' }}>
              No previous chats
            </p>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative px-4 md:px-8">
        {/* ── Empty state ─────────────────────────────────────────────────────── */}
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 pb-4 text-center mt-10 md:mt-0">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="h-6 w-6" style={{ color: 'oklch(0.72 0.2 300)' }} />
                <h1 className="font-display text-4xl md:text-5xl"
                  style={{
                    backgroundImage: 'linear-gradient(to right, oklch(0.65 0.2 260), oklch(0.68 0.22 300), oklch(0.72 0.2 340))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                  AI Co-Pilot
                </h1>
              </div>
              <p className="text-sm max-w-md" style={{ color: 'var(--muted-foreground)' }}>
                Your intelligent financial analyst for Indian markets. Ask about stocks,
                or analyse your portfolio — all in natural language.
              </p>
            </div>

            {/* Suggestion cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-4xl px-2">
              {SUGGESTIONS.map(({ label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  className="text-left rounded-xl border p-4 text-sm transition-all duration-150 group"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                    e.currentTarget.style.borderColor     = 'oklch(0.65 0.2 280 / 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                    e.currentTarget.style.borderColor     = 'var(--border)';
                  }}
                >
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>{label}</p>
                  <p className="text-xs mt-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{prompt}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Chat messages ────────────────────────────────────────────────────── */}
        {!isEmpty && (
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pb-4 pr-1 mt-12 md:mt-4">
            {messages.map((msg, i) =>
              msg.role === 'human'
                ? <UserMessage key={msg._id || i} content={msg.content} />
                : <AiMessage  key={msg._id || i} content={msg.content} />
            )}
            {loading && <ThinkingDots />}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Anchor for auto-scroll in empty state */}
        {isEmpty && <div ref={bottomRef} />}

        {/* ── Input bar ───────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 pt-3 max-w-4xl mx-auto w-full">
          <div
            className="flex items-end gap-3 rounded-xl border p-3 transition-colors duration-150 shadow-sm"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about stocks, or say 'Analyse my portfolio'…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed max-h-36 overflow-y-auto scrollbar-hide"
              style={{ color: 'var(--foreground)' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="h-9 w-9 flex items-center justify-center rounded-lg flex-shrink-0 transition-all duration-150 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, oklch(0.55 0.18 280), oklch(0.65 0.2 320))',
                color: 'white',
              }}
            >
              {loading
                ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <SendHorizonal className="h-4 w-4" />
              }
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            AI Co-Pilot uses real-time data from your account.
          </p>
        </div>
      </div>
      
    </div>
  );
}
