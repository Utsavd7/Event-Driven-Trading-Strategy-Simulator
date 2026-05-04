import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

function pct(v) { return v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`; }
function price(v) { return v == null ? '—' : `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
function crore(v) { if (!v) return '—'; const n = v / 1e7; return `₹${Math.abs(n).toFixed(0)} Cr`; }

// ── Sector heatmap colour scale ────────────────────────────────────────────
function heatColor(pChange) {
  const p = pChange || 0;
  if (p >= 2)   return { bg: '#00b38630', border: '#00b38660', text: '#00b386' };
  if (p >= 0.5) return { bg: '#00b38618', border: '#00b38630', text: '#00b386' };
  if (p > -0.5) return { bg: '#1e222d',   border: '#2a2e39',   text: '#787b86' };
  if (p > -2)   return { bg: '#e8433f18', border: '#e8433f30', text: '#e8433f' };
  return           { bg: '#e8433f30', border: '#e8433f60', text: '#e8433f' };
}

function shortSectorName(name) {
  return name
    .replace('NIFTY ', '')
    .replace('FINANCIAL SERVICES', 'FIN SVC')
    .replace('CONSR DURBL', 'CON DUR')
    .replace('OIL AND GAS', 'OIL&GAS')
    .replace('HEALTHCARE', 'HEALTH');
}

// ── Index Card ─────────────────────────────────────────────────────────────
function IndexCard({ name, data }) {
  const up = (data?.change_pct || 0) >= 0;
  return (
    <div className="md-idx-card">
      <div className="md-idx-name">{name}</div>
      <div className="md-idx-price">
        {data?.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '—'}
      </div>
      <div className={`md-idx-change ${up ? 'up' : 'down'}`}>
        {up ? '▲' : '▼'} {pct(data?.change_pct)}
        <span className="md-idx-abs"> ({data?.change >= 0 ? '+' : ''}{data?.change?.toFixed(2)})</span>
      </div>
    </div>
  );
}

// ── Sector Heatmap ─────────────────────────────────────────────────────────
function SectorHeatmap({ sectors, loading }) {
  return (
    <div className="md-card md-sector-card">
      <div className="md-card-title">Sector Performance
        <span className="md-live-tag">LIVE</span>
      </div>
      {loading ? (
        <div className="md-loading-grid">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="md-skeleton-cell" />
          ))}
        </div>
      ) : sectors.length === 0 ? (
        <div className="md-empty-sm">No sector data — NSE may be closed</div>
      ) : (
        <div className="md-heatmap-grid">
          {sectors.map(s => {
            const { bg, border, text } = heatColor(s.pChange);
            return (
              <div key={s.name} className="md-heatmap-cell" style={{ background: bg, borderColor: border }}>
                <div className="md-heatmap-name">{shortSectorName(s.name)}</div>
                <div className="md-heatmap-pct" style={{ color: text }}>{pct(s.pChange)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── FII/DII Widget ─────────────────────────────────────────────────────────
function FiiDiiWidget({ data, loading }) {
  const rows = data?.data?.slice(0, 5) || [];
  if (loading) return (
    <div className="md-card md-fiidii-card">
      <div className="md-card-title">FII / DII Flows</div>
      {[1,2,3].map(i => <div key={i} className="md-skeleton-row" />)}
    </div>
  );
  return (
    <div className="md-card md-fiidii-card">
      <div className="md-card-title">FII / DII Flows</div>
      <div className="fii-legend">
        <span className="fii-legend-item"><span className="fii-dot fii-dot-buy" />Buy</span>
        <span className="fii-legend-item"><span className="fii-dot fii-dot-sell" />Sell</span>
        <span className="fii-legend-item"><span className="fii-dot fii-dot-net" />Net</span>
      </div>
      {rows.length === 0 ? (
        <div className="md-empty-sm">Data unavailable — NSE closed</div>
      ) : rows.map((row, i) => {
        const cat = row.category || row.name || `Entry ${i+1}`;
        const buy = row.buyValue ?? row.buy ?? 0;
        const sell = row.sellValue ?? row.sell ?? 0;
        const net = row.netValue ?? row.net ?? (buy - sell);
        const netUp = net >= 0;
        return (
          <div key={i} className="fii-row">
            <div className="fii-cat">{cat}</div>
            <div className="fii-vals">
              <span className="fii-val up">{crore(buy)}</span>
              <span className="fii-val down">{crore(sell)}</span>
              <span className={`fii-val fii-net ${netUp ? 'up' : 'down'}`}>{netUp ? '+' : ''}{crore(net)}</span>
            </div>
          </div>
        );
      })}
      <div className="fii-footer">Source: NSE India · Updated daily</div>
    </div>
  );
}

// ── Market Breadth ─────────────────────────────────────────────────────────
function MarketBreadth({ data, loading }) {
  const adv = data?.advances || 0;
  const dec = data?.declines || 0;
  const unc = data?.unchanged || 0;
  const total = adv + dec + unc || 1;
  return (
    <div className="md-card md-breadth-card">
      <div className="md-card-title">Market Breadth
        <span className="md-breadth-total">NIFTY 500</span>
      </div>
      {loading ? <div className="md-skeleton-row" /> : (
        <>
          <div className="breadth-bar-wrap">
            <div className="breadth-bar">
              <div className="breadth-seg breadth-adv" style={{ width: `${(adv/total)*100}%` }} />
              <div className="breadth-seg breadth-unc" style={{ width: `${(unc/total)*100}%` }} />
              <div className="breadth-seg breadth-dec" style={{ width: `${(dec/total)*100}%` }} />
            </div>
          </div>
          <div className="breadth-stats">
            <div className="breadth-stat"><span className="up">{adv}</span><span>Advancing</span></div>
            <div className="breadth-stat"><span style={{ color: '#787b86' }}>{unc}</span><span>Unchanged</span></div>
            <div className="breadth-stat"><span className="down">{dec}</span><span>Declining</span></div>
          </div>
          <div className="breadth-ratio">
            A/D Ratio: <strong style={{ color: adv > dec ? '#00b386' : '#e8433f' }}>{dec > 0 ? (adv/dec).toFixed(2) : '—'}</strong>
          </div>
        </>
      )}
    </div>
  );
}

// ── Movers Table ───────────────────────────────────────────────────────────
function MoversTable({ title, stocks, type, loading, onSelect }) {
  return (
    <div className="md-card md-movers-card">
      <div className="md-card-title">
        {title}
        <span className={`md-movers-badge ${type}`}>{type === 'gain' ? '▲' : '▼'}</span>
      </div>
      {loading ? (
        Array(5).fill(0).map((_, i) => <div key={i} className="md-skeleton-row" />)
      ) : stocks.length === 0 ? (
        <div className="md-empty-sm">No data available</div>
      ) : (
        <table className="md-movers-table">
          <thead>
            <tr>
              <th>Symbol</th><th>Price</th><th>Change</th><th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s, i) => {
              const up = (s.pChange || 0) >= 0;
              return (
                <tr key={i} onClick={() => onSelect(s.symbol)} className="md-movers-row-tr">
                  <td>
                    <div className="md-movers-sym">{s.symbol}</div>
                    <div className="md-movers-series">{s.series || 'EQ'}</div>
                  </td>
                  <td className="right">₹{(s.lastPrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className={`right ${up ? 'up' : 'down'}`}>
                    {up ? '+' : ''}{(s.pChange || 0).toFixed(2)}%
                  </td>
                  <td className="right">{s.totalTradedVolume > 1e6 ? `${(s.totalTradedVolume/1e6).toFixed(1)}M` : s.totalTradedVolume > 1e3 ? `${(s.totalTradedVolume/1e3).toFixed(0)}K` : (s.totalTradedVolume || 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
function MarketDashboard({ indices, onSelectTicker }) {
  const [sectors, setSectors] = useState([]);
  const [fiiDii, setFiiDii] = useState(null);
  const [movers, setMovers] = useState({ gainers: [], losers: [], advances: 0, declines: 0, unchanged: 0 });
  const [marketStatus, setMarketStatus] = useState(null);
  const [loading, setLoading] = useState({ sectors: true, fii: true, movers: true });

  const fetchAll = useCallback(async () => {
    const [sectRes, fiiRes, movRes, statusRes] = await Promise.allSettled([
      api.getSectorPerformance(),
      api.getFiiDii(),
      api.getGainersLosers(),
      api.getMarketStatus(),
    ]);
    if (sectRes.status === 'fulfilled') setSectors(sectRes.value.data || []);
    if (fiiRes.status === 'fulfilled') setFiiDii(fiiRes.value.data);
    if (movRes.status === 'fulfilled') setMovers(movRes.value.data || {});
    if (statusRes.status === 'fulfilled') setMarketStatus(statusRes.value.data);
    setLoading({ sectors: false, fii: false, movers: false });
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 120000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const now = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  const ist = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  const marketOpen = marketStatus?.marketState?.marketStatus === 'Open' ||
    marketStatus?.marketState?.tradeDate != null;

  return (
    <div className="md-root">
      <div className="md-header">
        <div>
          <div className="md-title">Market Overview</div>
          <div className="md-date">{now} · {ist} IST</div>
        </div>
        <div className="md-status-pill" data-open={marketOpen}>
          <span className="md-status-dot" />
          {marketOpen ? 'Market Open' : 'Market Closed'}
        </div>
      </div>

      {/* Indices row */}
      <div className="md-indices-row">
        {indices && Object.entries(indices).map(([name, data]) => (
          <IndexCard key={name} name={name} data={data} />
        ))}
        {!indices && [1,2,3,4].map(i => (
          <div key={i} className="md-idx-card md-idx-skeleton">
            <div className="md-skeleton-line" style={{ width: '60%', height: 10, marginBottom: 8 }} />
            <div className="md-skeleton-line" style={{ width: '80%', height: 22, marginBottom: 6 }} />
            <div className="md-skeleton-line" style={{ width: '50%', height: 13 }} />
          </div>
        ))}
      </div>

      {/* Sector heatmap + FII/DII + Breadth */}
      <div className="md-row2">
        <SectorHeatmap sectors={sectors} loading={loading.sectors} />
        <div className="md-col-right">
          <FiiDiiWidget data={fiiDii} loading={loading.fii} />
          <MarketBreadth data={movers} loading={loading.movers} />
        </div>
      </div>

      {/* Gainers / Losers */}
      <div className="md-movers-row">
        <MoversTable
          title="Top Gainers"
          stocks={movers.gainers || []}
          type="gain"
          loading={loading.movers}
          onSelect={onSelectTicker}
        />
        <MoversTable
          title="Top Losers"
          stocks={movers.losers || []}
          type="loss"
          loading={loading.movers}
          onSelect={onSelectTicker}
        />
      </div>
    </div>
  );
}

export default MarketDashboard;
