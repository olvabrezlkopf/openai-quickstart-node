import Head from 'next/head';
import { useState, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { getSessionData, movingAverage, weekAverage } from '../../lib/chartData';
import { exportCsv } from '../../lib/exports';
import { CATEGORIES } from '../../lib/constants';
import MetricCard from '../../components/MetricCard';
import { ChartLineUp, DownloadSimple, FunnelSimple, ChartLine } from '@phosphor-icons/react';
import styles from './index.module.css';

const TABS = [
  { id: 'reduction', label: 'Reduktionsquote' },
  { id: 'category', label: 'Kategorien' },
  { id: 'raw', label: 'Rohdaten' },
];

const CHART_W = 760;
const CHART_H = 320;
const M = { top: 20, right: 20, bottom: 45, left: 50 };
const PW = CHART_W - M.left - M.right;
const PH = CHART_H - M.top - M.bottom;

export default function AnalyticsPage() {
  const { state, isHydrated } = useData();
  const [tab, setTab] = useState('reduction');
  const [selectedCat, setSelectedCat] = useState(null);
  const [tip, setTip] = useState(null);
  const svgRef = useRef(null);

  const sessions = useMemo(() => (isHydrated ? getSessionData(state) : []), [state, isHydrated]);

  if (!isHydrated) return null;

  const handleExport = () => exportCsv(state);

  const showTip = (e, data) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10, ...data });
  };

  if (sessions.length === 0) {
    return (
      <div>
        <Head><title>Analytics — Mutig</title></Head>
        <div className={styles.hero}>
          <ChartLineUp size={40} weight="duotone" className={styles.heroIcon} />
          <h1 className={styles.heroTitle}>Deine Fortschritte</h1>
          <p className={styles.heroSub}>Sobald du Challenges abgeschlossen hast, siehst du hier deine Auswertung.</p>
        </div>
      </div>
    );
  }

  const avgFirst = weekAverage(sessions, true);
  const avgLast = weekAverage(sessions, false);
  const delta = avgFirst - avgLast;

  return (
    <div>
      <Head><title>Analytics — Mutig</title></Head>

      <div className={styles.hero}>
        <ChartLineUp size={40} weight="duotone" className={styles.heroIcon} />
        <h1 className={styles.heroTitle}>Deine Fortschritte</h1>
        <p className={styles.heroSub}>Verstehe, wie sich deine Anspannung über Zeit verändert.</p>
      </div>

      {tab === 'reduction' && (
        <div className={styles.summaryGrid}>
          <MetricCard label="Ø erste Woche" value={`${avgFirst}%`} color="var(--color-gray-400)" />
          <MetricCard label="Ø letzte Woche" value={`${avgLast}%`} color="var(--color-primary)" />
          <MetricCard label="Delta" value={`${delta > 0 ? '-' : '+'}${Math.abs(delta)}%`} color={delta > 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
          <MetricCard label="Sitzungen" value={sessions.length} color="var(--color-warning)" />
        </div>
      )}

      <div className={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => { setTab(t.id); setTip(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'category' && (
        <div className={styles.catBar}>
          {getAvailableCategories(sessions).map((cat) => (
            <button
              key={cat}
              className={`${styles.catPill} ${selectedCat === cat ? styles.catPillActive : ''}`}
              onClick={() => { setSelectedCat(cat === selectedCat ? null : cat); setTip(null); }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className={styles.chartWrap}>
        <div className={styles.chartContainer} ref={svgRef}>
          {tab === 'reduction' && <ReductionChart sessions={sessions} onHover={showTip} onLeave={() => setTip(null)} />}
          {tab === 'category' && <CategoryChart sessions={sessions} category={selectedCat} onHover={showTip} onLeave={() => setTip(null)} />}
          {tab === 'raw' && <RawDataChart sessions={sessions} onHover={showTip} onLeave={() => setTip(null)} />}
          {tip && (
            <div className={styles.tooltip} style={{ left: Math.min(tip.x, PW - 100), top: tip.y }}>
              <div className={styles.tipDate}>{tip.date}</div>
              {tip.title && <div className={styles.tipTitle}>{tip.title}</div>}
              <div>Vorher: {tip.before} · Nachher: {tip.after}</div>
              {tip.ratio != null && <div>Quote: {tip.ratio}%</div>}
            </div>
          )}
        </div>
      </div>

      {tab === 'category' && selectedCat && <CategoryStats sessions={sessions} category={selectedCat} />}
      {tab === 'raw' && (
        <p className={styles.disclaimer}>Schwierigkeitswechsel zwischen Situationen sind hier nicht herausgerechnet.</p>
      )}

      <div className={styles.exportBar}>
        <button className={styles.exportBtn} onClick={handleExport}>
          <DownloadSimple size={18} weight="bold" /> CSV exportieren
        </button>
      </div>
    </div>
  );
}

function yScale(val, max) {
  return M.top + PH - (val / max) * PH;
}

function xPos(i, n) {
  return M.left + (i + 0.5) * (PW / n);
}

function GridLines({ max, steps, suffix = '' }) {
  return steps.map((v) => (
    <g key={v}>
      <line x1={M.left} y1={yScale(v, max)} x2={M.left + PW} y2={yScale(v, max)} stroke="#f3f4f6" strokeWidth={1} />
      <text x={M.left - 8} y={yScale(v, max) + 4} textAnchor="end" fill="#9ca3af" fontSize={11}>{v}{suffix}</text>
    </g>
  ));
}

function XLabels({ data, n }) {
  const step = Math.max(1, Math.floor(n / 12));
  return data.map((d, i) => {
    if (i % step !== 0) return null;
    const label = d.date ? new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : `#${i + 1}`;
    return (
      <text key={i} x={xPos(i, n)} y={CHART_H - 5} textAnchor="middle" fill="#9ca3af" fontSize={10}>
        {label}
      </text>
    );
  });
}

function ReductionChart({ sessions, onHover, onLeave }) {
  const n = sessions.length;
  const ratios = sessions.map((s) => s.ratio);
  const ma = movingAverage(ratios, 5);
  const barW = Math.min(40, Math.max(8, (PW / n) * 0.65));

  const maPoints = ma.map((v, i) => `${xPos(i, n)},${yScale(v, 100)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.svg}>
      <GridLines max={100} steps={[0, 25, 50, 75, 100]} suffix="%" />
      {sessions.map((s, i) => (
        <rect
          key={i}
          x={xPos(i, n) - barW / 2}
          y={yScale(s.ratio, 100)}
          width={barW}
          height={yScale(0, 100) - yScale(s.ratio, 100)}
          rx={3}
          fill="rgba(79, 70, 229, 0.55)"
          className={styles.bar}
          onMouseEnter={(e) => onHover(e, s)}
          onMouseLeave={onLeave}
        />
      ))}
      <polyline points={maPoints} fill="none" stroke="#4f46e5" strokeWidth={2.5} strokeLinejoin="round" />
      {ma.map((v, i) => (
        <circle key={i} cx={xPos(i, n)} cy={yScale(v, 100)} r={3} fill="#4f46e5" />
      ))}
      <XLabels data={sessions} n={n} />
    </svg>
  );
}

function CategoryChart({ sessions, category, onHover, onLeave }) {
  const filtered = category ? sessions.filter((s) => s.category === category) : sessions;

  if (category && filtered.length < 3) {
    return (
      <div className={styles.emptyChart}>
        <FunnelSimple size={32} weight="duotone" />
        <p>Noch zu wenige Daten für eine aussagekräftige Auswertung in dieser Kategorie.</p>
        <p className={styles.emptyHint}>Mindestens 3 Sitzungen nötig — aktuell: {filtered.length}</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>Wähle eine Kategorie oben, um den Verlauf zu sehen.</p>
      </div>
    );
  }

  const n = filtered.length;
  const barW = Math.min(40, Math.max(8, (PW / n) * 0.65));
  const afterPoints = filtered.map((s, i) => `${xPos(i, n)},${yScale(s.after, 10)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.svg}>
      <GridLines max={10} steps={[0, 2, 4, 6, 8, 10]} />
      {filtered.map((s, i) => (
        <rect
          key={i}
          x={xPos(i, n) - barW / 2}
          y={yScale(s.before, 10)}
          width={barW}
          height={yScale(0, 10) - yScale(s.before, 10)}
          rx={3}
          fill="rgba(156, 163, 175, 0.4)"
          className={styles.bar}
          onMouseEnter={(e) => onHover(e, s)}
          onMouseLeave={onLeave}
        />
      ))}
      <polyline points={afterPoints} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" />
      {filtered.map((s, i) => (
        <circle key={i} cx={xPos(i, n)} cy={yScale(s.after, 10)} r={3.5} fill="#10b981" />
      ))}
      <XLabels data={filtered} n={n} />
    </svg>
  );
}

function RawDataChart({ sessions, onHover, onLeave }) {
  const n = sessions.length;
  const beforePts = sessions.map((s, i) => `${xPos(i, n)},${yScale(s.before, 10)}`).join(' ');
  const afterPts = sessions.map((s, i) => `${xPos(i, n)},${yScale(s.after, 10)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.svg}>
      <GridLines max={10} steps={[0, 2, 4, 6, 8, 10]} />
      <polyline points={beforePts} fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinejoin="round" />
      <polyline points={afterPts} fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinejoin="round" />
      {sessions.map((s, i) => (
        <g key={i}>
          <circle cx={xPos(i, n)} cy={yScale(s.before, 10)} r={3.5} fill="#818cf8"
            onMouseEnter={(e) => onHover(e, s)} onMouseLeave={onLeave} className={styles.dot} />
          <circle cx={xPos(i, n)} cy={yScale(s.after, 10)} r={3.5} fill="#f97316"
            onMouseEnter={(e) => onHover(e, s)} onMouseLeave={onLeave} className={styles.dot} />
        </g>
      ))}
      <XLabels data={sessions} n={n} />
      <g transform={`translate(${M.left + 10}, ${M.top + 10})`}>
        <line x1={0} y1={0} x2={18} y2={0} stroke="#818cf8" strokeWidth={2.5} />
        <text x={24} y={4} fontSize={11} fill="#6b7280">Vorher</text>
        <line x1={80} y1={0} x2={98} y2={0} stroke="#f97316" strokeWidth={2.5} />
        <text x={104} y={4} fontSize={11} fill="#6b7280">Nachher</text>
      </g>
    </svg>
  );
}

function CategoryStats({ sessions, category }) {
  const filtered = sessions.filter((s) => s.category === category);
  if (filtered.length < 2) return null;

  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const change = first.after > 0
    ? Math.round(((last.after - first.after) / first.after) * 100)
    : 0;

  return (
    <div className={styles.catStats}>
      <div className={styles.catStatItem}>
        <span className={styles.catStatLabel}>Erste Sitzung (nachher)</span>
        <span className={styles.catStatValue}>{first.after}/10</span>
      </div>
      <div className={styles.catStatItem}>
        <span className={styles.catStatLabel}>Letzte Sitzung (nachher)</span>
        <span className={styles.catStatValue}>{last.after}/10</span>
      </div>
      <div className={styles.catStatItem}>
        <span className={styles.catStatLabel}>Veränderung</span>
        <span className={`${styles.catStatValue} ${change <= 0 ? styles.positive : styles.negative}`}>
          {change <= 0 ? '' : '+'}{change}%
        </span>
      </div>
    </div>
  );
}

function getAvailableCategories(sessions) {
  const cats = new Set(sessions.map((s) => s.category));
  return CATEGORIES.filter((c) => cats.has(c));
}
