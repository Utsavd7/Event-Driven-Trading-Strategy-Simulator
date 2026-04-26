import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import api from '../api';

const STARTER_QUESTIONS = [
  'What drove the best trades in this backtest?',
  'How does this stock typically react around RBI policy days?',
  'How should I adjust the window to improve Sharpe for Indian markets?',
  'Is a pre-earnings entry 2 days before better than 1 day for this stock?',
  'What FII/DII flow patterns should I watch for this sector?',
  'What are the biggest risks for this event-driven strategy?',
];

// ── Tiny markdown renderer (bold, code, headers) ──────────────────────────────
function MarkdownText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="md-content">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="md-h2">{line.slice(3)}</h3>;
        if (line.startsWith('### ')) return <h4 key={i} className="md-h3">{line.slice(4)}</h4>;
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="md-bold">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i} className="md-li">{renderInline(line.slice(2))}</li>;
        }
        if (line.trim() === '') return <div key={i} className="md-spacer" />;
        return <p key={i} className="md-p">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="md-code">{p.slice(1, -1)}</code>;
    return p;
  });
}


// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab({ backtestData, ticker }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm **QuantIQ**, your AI quantitative analyst.\n\nI have access to your backtest data for **${ticker || 'your ticker'}**. Ask me anything about the strategy, risk, or how to improve performance.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset greeting when ticker changes
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Hello! I'm **QuantIQ**, your AI quantitative analyst.\n\nI have access to your backtest data for **${ticker || 'your ticker'}**. Ask me anything about the strategy, risk, or how to improve performance.`,
    }]);
  }, [ticker]);

  const sendMessage = async (text) => {
    if (!text.trim() || streaming) return;
    const userMsg = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setStreaming(true);

    const assistantPlaceholder = { role: 'assistant', content: '' };
    setMessages([...updated, assistantPlaceholder]);

    try {
      const context = backtestData ? {
        ticker,
        overall_metrics: backtestData.overall_metrics,
        metrics_by_event: backtestData.metrics_by_event,
        top_trades: backtestData.event_returns?.slice(0, 5),
      } : null;

      const res = await api.streamChat(updated, context);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: accumulated };
                return next;
              });
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: `❌ Connection error: ${err.message}` };
        return next;
      });
    }
    setStreaming(false);
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="chat-avatar ai-avatar">Q</div>
            )}
            <div className="chat-bubble">
              <MarkdownText text={msg.content} />
              {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                <span className="streaming-cursor" />
              )}
            </div>
            {msg.role === 'user' && (
              <div className="chat-avatar user-avatar">U</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!backtestData && (
        <div className="chat-starters">
          {STARTER_QUESTIONS.map((q, i) => (
            <button key={i} className="starter-chip" onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-bar">
        <input
          className="chat-input"
          placeholder="Ask QuantIQ about your strategy..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          disabled={streaming}
        />
        <button
          className={`chat-send-btn ${streaming ? 'loading' : ''}`}
          onClick={() => sendMessage(input)}
          disabled={streaming || !input.trim()}
        >
          {streaming ? '...' : '→'}
        </button>
      </div>
    </div>
  );
}


// ── ML Signals Tab ────────────────────────────────────────────────────────────
function MLSignalsTab({ ticker }) {
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    api.getMLSignals(ticker)
      .then(res => setMlData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <div className="ml-loading">
        <div className="loading-spinner" />
        <p>Running ML pipeline for {ticker}...</p>
        <p className="ml-loading-sub">Training Random Forest on earnings history</p>
      </div>
    );
  }

  if (error) {
    return <div className="ml-error">ML error: {error}</div>;
  }

  if (!mlData) return null;

  const { earnings_predictor: ep, market_regime: mr, anomalies } = mlData;
  const regimeColor = mr?.current === 'bull_low_vol' ? 'var(--color-success)'
    : mr?.current === 'bear_high_vol' ? 'var(--color-error)'
    : 'var(--color-warning)';

  const regimeLabel = {
    bull_low_vol: '🟢 Bull / Low Volatility',
    bear_high_vol: '🔴 Bear / High Volatility',
    neutral: '🟡 Neutral',
    unknown: '⚪ Unknown',
  }[mr?.current || 'unknown'];

  const signalColor = ep?.signal === 'BUY' ? 'var(--color-success)'
    : ep?.signal === 'SELL' ? 'var(--color-error)'
    : 'var(--color-warning)';

  const importances = ep?.feature_importances || {};
  const featNames = Object.keys(importances).sort((a, b) => importances[b] - importances[a]);
  const featValues = featNames.map(k => importances[k]);

  const regimeHistory = mr?.history || [];
  const regimeDates = regimeHistory.map(r => r.date);
  const regimeNums = regimeHistory.map(r =>
    r.regime === 'bull_low_vol' ? 1 : r.regime === 'bear_high_vol' ? -1 : 0
  );

  return (
    <div className="ml-panel">
      <div className="ml-grid">
        {/* Earnings signal card */}
        <div className="ml-card">
          <div className="ml-card-header">Next Earnings Signal</div>
          <div className="ml-signal-row">
            <span className="ml-signal-badge" style={{ background: signalColor + '22', color: signalColor, border: `1px solid ${signalColor}` }}>
              {ep?.signal || 'HOLD'}
            </span>
            <span className="ml-confidence">
              {((ep?.confidence || 0.5) * 100).toFixed(0)}% confidence
            </span>
          </div>
          <div className="ml-stat-row">
            <span className="ml-stat-label">Predicted Return</span>
            <span className="ml-stat-value" style={{ color: (ep?.predicted_return || 0) >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {((ep?.predicted_return || 0) * 100).toFixed(2)}%
            </span>
          </div>
          <div className="confidence-bar-wrap">
            <div className="confidence-bar">
              <div className="confidence-fill" style={{ width: `${(ep?.confidence || 0.5) * 100}%`, background: signalColor }} />
            </div>
          </div>
          <div className="ml-meta">
            Trained on {ep?.n_training_samples || 0} trades · CV accuracy {((ep?.cv_accuracy || 0) * 100).toFixed(0)}%
          </div>
        </div>

        {/* Market regime card */}
        <div className="ml-card">
          <div className="ml-card-header">Market Regime</div>
          <div className="ml-regime-badge" style={{ color: regimeColor }}>{regimeLabel}</div>
          <div className="ml-stat-row">
            <span className="ml-stat-label">Confidence</span>
            <span className="ml-stat-value">{((mr?.confidence || 0) * 100).toFixed(0)}%</span>
          </div>
          <div className="ml-stat-row">
            <span className="ml-stat-label">20d Return</span>
            <span className="ml-stat-value" style={{ color: (mr?.return_20d || 0) >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {((mr?.return_20d || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="ml-stat-row">
            <span className="ml-stat-label">20d Volatility</span>
            <span className="ml-stat-value">{((mr?.vol_20d || 0) * 100).toFixed(1)}%</span>
          </div>
          <div className="ml-stat-row">
            <span className="ml-stat-label">Anomalies Detected</span>
            <span className="ml-stat-value" style={{ color: (anomalies?.total || 0) > 5 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
              {anomalies?.total || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Regime history chart */}
      {regimeDates.length > 0 && (
        <div className="ml-chart-section">
          <div className="ml-chart-title">Regime History (Last 60 Days)</div>
          <Plot
            data={[{
              x: regimeDates,
              y: regimeNums,
              type: 'scatter',
              mode: 'lines',
              fill: 'tozeroy',
              line: { color: '#2962ff', width: 2 },
              fillcolor: 'rgba(41, 98, 255, 0.1)',
            }]}
            layout={{
              paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
              font: { color: '#d1d4dc', family: 'Inter, sans-serif', size: 11 },
              xaxis: { gridcolor: 'rgba(255,255,255,0.05)', color: '#787b86' },
              yaxis: {
                gridcolor: 'rgba(255,255,255,0.05)', color: '#787b86',
                tickvals: [-1, 0, 1], ticktext: ['Bear', 'Neutral', 'Bull'],
              },
              margin: { l: 55, r: 10, t: 10, b: 35 },
              height: 160,
            }}
            style={{ width: '100%' }}
            config={{ displayModeBar: false }}
          />
        </div>
      )}

      {/* Feature importances chart */}
      {featNames.length > 0 && (
        <div className="ml-chart-section">
          <div className="ml-chart-title">Feature Importances (Earnings Model)</div>
          <Plot
            data={[{
              x: featValues,
              y: featNames,
              type: 'bar',
              orientation: 'h',
              marker: { color: '#2962ff', opacity: 0.8 },
            }]}
            layout={{
              paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
              font: { color: '#d1d4dc', family: 'Inter, sans-serif', size: 11 },
              xaxis: { gridcolor: 'rgba(255,255,255,0.05)', color: '#787b86' },
              yaxis: { color: '#787b86' },
              margin: { l: 100, r: 10, t: 10, b: 30 },
              height: 180,
            }}
            style={{ width: '100%' }}
            config={{ displayModeBar: false }}
          />
        </div>
      )}
    </div>
  );
}


// ── Research Agent Tab ────────────────────────────────────────────────────────
const RESEARCH_STEPS = [
  { key: 'fundamentals', label: 'Company Fundamentals' },
  { key: 'sentiment', label: 'News Sentiment' },
  { key: 'price_action', label: 'Technical Analysis' },
  { key: 'synthesis', label: 'Trade Thesis' },
];

function ResearchTab({ ticker }) {
  const [stepStatus, setStepStatus] = useState({});
  const [stepContent, setStepContent] = useState({});
  const [synthesis, setSynthesis] = useState('');
  const [running, setRunning] = useState(false);
  const [avgSentiment, setAvgSentiment] = useState(null);
  const esRef = useRef(null);

  const startResearch = () => {
    if (running) return;
    setStepStatus({});
    setStepContent({});
    setSynthesis('');
    setAvgSentiment(null);
    setRunning(true);

    const es = api.streamResearch(ticker);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { step, content, message, avg_sentiment } = data;

        if (step === 'fundamentals') setStepStatus(p => ({ ...p, fundamentals: 'active' }));
        if (step === 'fundamentals_done') {
          setStepStatus(p => ({ ...p, fundamentals: 'done' }));
          setStepContent(p => ({ ...p, fundamentals: content }));
          setStepStatus(p => ({ ...p, sentiment: 'active' }));
        }
        if (step === 'sentiment_done') {
          setStepStatus(p => ({ ...p, sentiment: 'done' }));
          setStepContent(p => ({ ...p, sentiment: content }));
          if (avg_sentiment !== undefined) setAvgSentiment(avg_sentiment);
          setStepStatus(p => ({ ...p, price_action: 'active' }));
        }
        if (step === 'price_done') {
          setStepStatus(p => ({ ...p, price_action: 'done' }));
          setStepContent(p => ({ ...p, price_action: content }));
          setStepStatus(p => ({ ...p, synthesis: 'active' }));
        }
        if (step === 'synthesis_stream') {
          setSynthesis(prev => prev + content);
        }
        if (step === 'done') {
          setStepStatus(p => ({ ...p, synthesis: 'done' }));
          setRunning(false);
          es.close();
        }
        if (step === 'error') {
          setStepContent(p => ({ ...p, error: message }));
          setRunning(false);
          es.close();
        }
      } catch (_) {}
    };

    es.onerror = () => {
      setRunning(false);
      es.close();
    };
  };

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  const sentimentColor = avgSentiment === null ? 'var(--text-secondary)'
    : avgSentiment > 0.1 ? 'var(--color-success)'
    : avgSentiment < -0.1 ? 'var(--color-error)'
    : 'var(--color-warning)';

  return (
    <div className="research-panel">
      <div className="research-header">
        <div>
          <h3 className="research-title">AI Research Agent</h3>
          <p className="research-subtitle">
            Multi-step agentic analysis: fundamentals → sentiment → technicals → trade thesis
          </p>
        </div>
        <button
          className={`research-run-btn ${running ? 'running' : ''}`}
          onClick={startResearch}
          disabled={running}
        >
          {running ? (
            <><span className="btn-spinner" /> Researching...</>
          ) : (
            `Research ${ticker}`
          )}
        </button>
      </div>

      {stepContent.error && (
        <div className="research-error">{stepContent.error}</div>
      )}

      {(Object.keys(stepStatus).length > 0 || running) && (
        <div className="research-timeline">
          {RESEARCH_STEPS.map(({ key, label }) => {
            const status = stepStatus[key] || 'pending';
            return (
              <div key={key} className={`timeline-step ${status}`}>
                <div className={`step-icon ${status}`}>
                  {status === 'done' ? '✓' : status === 'active' ? '○' : '·'}
                </div>
                <div className="step-body">
                  <div className="step-label">{label}</div>
                  {stepContent[key] && (
                    <div className="step-content">{stepContent[key]}</div>
                  )}
                  {key === 'sentiment' && avgSentiment !== null && status === 'done' && (
                    <div className="step-badge" style={{ color: sentimentColor }}>
                      Avg sentiment: {avgSentiment > 0 ? '+' : ''}{avgSentiment.toFixed(3)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {synthesis && (
        <div className="synthesis-card">
          <MarkdownText text={synthesis} />
          {running && <span className="streaming-cursor" />}
        </div>
      )}

      {!running && Object.keys(stepStatus).length === 0 && (
        <div className="research-empty">
          <div className="research-empty-icon">🔍</div>
          <p>Click <strong>Research {ticker}</strong> to run a full AI-powered analysis.</p>
          <p className="research-empty-sub">
            The agent fetches real company data, analyzes recent news sentiment,
            reviews technical indicators, then synthesizes a trade thesis.
          </p>
        </div>
      )}
    </div>
  );
}


// ── Main AIPanel ──────────────────────────────────────────────────────────────
function AIPanel({ backtestData, ticker }) {
  const [activeTab, setActiveTab] = useState('chat');

  const tabs = [
    { key: 'chat', label: 'Strategy Chat' },
    { key: 'ml', label: 'ML Signals' },
    { key: 'research', label: 'Research Agent' },
  ];

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-logo-badge">Q</span>
          QuantIQ Intelligence
        </div>
        <div className="ai-panel-subtitle">Powered by Groq · Llama 3.3 70B · Free tier</div>
      </div>

      <div className="ai-tab-bar">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`ai-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ai-tab-content">
        {activeTab === 'chat' && <ChatTab backtestData={backtestData} ticker={ticker} />}
        {activeTab === 'ml' && <MLSignalsTab ticker={ticker} />}
        {activeTab === 'research' && <ResearchTab ticker={ticker} />}
      </div>
    </div>
  );
}

export default AIPanel;
