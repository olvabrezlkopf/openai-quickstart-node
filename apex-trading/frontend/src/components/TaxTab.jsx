import { useState, useEffect } from 'react'
import { api } from '../api'

const EUR = (v) => `€${(v ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const FREIGRENZE = 1000

export default function TaxTab() {
  const [years, setYears]       = useState([])
  const [year, setYear]         = useState(null)
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    api.taxYears().then(ys => {
      setYears(ys)
      if (ys.length > 0) setYear(Number(ys[0]))
    }).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    if (!year) return
    setLoading(true)
    setError(null)
    api.taxSummary(year).then(s => {
      setSummary(s)
      setLoading(false)
    }).catch(e => {
      setError(e.message)
      setLoading(false)
    })
  }, [year])

  const freigrenzePct = summary
    ? Math.min(100, (Math.max(0, summary.net_profit_eur) / FREIGRENZE) * 100)
    : 0
  const overFreigrenze = summary && !summary.freigrenze_used && summary.net_profit_eur > FREIGRENZE

  function handleExport() {
    window.open(api.taxExportUrl(year), '_blank')
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Tax Report — §23 EStG</h2>
        <div style={styles.controls}>
          <select
            style={styles.select}
            value={year ?? ''}
            onChange={e => setYear(Number(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
            {years.length === 0 && <option value="">No data</option>}
          </select>
          <button
            style={styles.exportBtn}
            onClick={handleExport}
            disabled={!year || years.length === 0}
          >
            Download CSV
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {loading && <div style={styles.muted}>Loading…</div>}

      {summary && !loading && (
        <>
          {/* Freigrenze bar */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.label}>Freigrenze Progress (€1,000 / year)</span>
              <span style={{ color: overFreigrenze ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--mono)', fontSize: 13 }}>
                {overFreigrenze ? 'STEUERPFLICHTIG' : 'STEUERFREI'}
              </span>
            </div>
            <div style={styles.barTrack}>
              <div style={{
                ...styles.barFill,
                width: `${freigrenzePct}%`,
                background: overFreigrenze ? 'var(--red)' : 'var(--green)',
              }} />
            </div>
            <div style={styles.barLabels}>
              <span style={styles.muted}>€0</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: overFreigrenze ? 'var(--red)' : 'var(--green)' }}>
                {EUR(summary.net_profit_eur)} / {EUR(FREIGRENZE)}
              </span>
              <span style={styles.muted}>€1,000</span>
            </div>
          </div>

          {/* Summary grid */}
          <div style={styles.grid}>
            <MetricCard label="Gesamtgewinne" value={EUR(summary.total_gains_eur)} color="var(--green)" />
            <MetricCard label="Gesamtverluste" value={EUR(summary.total_losses_eur)} color="var(--red)" />
            <MetricCard label="Nettogewinn" value={EUR(summary.net_profit_eur)} color={summary.net_profit_eur >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricCard label="Gebühren (WK)" value={EUR(summary.total_fees_eur)} color="var(--muted)" />
            <MetricCard label="Steuerpflichtiger Betrag" value={EUR(summary.taxable_amount_eur)} color="var(--cyan)" />
            <MetricCard label="Steuerlast (26.375%)" value={EUR(summary.tax_due_eur)} color={summary.tax_due_eur > 0 ? 'var(--red)' : 'var(--green)'} />
          </div>

          {/* Trade stats */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.label}>Trade Statistics — {summary.tax_year}</span>
            </div>
            <div style={styles.statsRow}>
              <Stat label="Trades Total" value={summary.trade_count} />
              <Stat label="Gewinner" value={summary.winning_trades} color="var(--green)" />
              <Stat label="Verlierer" value={summary.losing_trades} color="var(--red)" />
              <Stat label="Win Rate" value={summary.trade_count ? `${((summary.winning_trades / summary.trade_count) * 100).toFixed(1)}%` : '—'} color="var(--cyan)" />
              <Stat label="Steuersatz" value={`${(summary.effective_rate * 100).toFixed(3)}%`} />
              <Stat label="Freigrenze genutzt" value={summary.freigrenze_used ? 'JA' : 'NEIN'} color={summary.freigrenze_used ? 'var(--green)' : 'var(--red)'} />
            </div>
          </div>

          <div style={styles.disclaimer}>
            Diese Berechnung dient nur zur Orientierung und ersetzt keine steuerliche Beratung. §23 EStG — Private Veräußerungsgeschäfte.
          </div>
        </>
      )}

      {!summary && !loading && !error && (
        <div style={styles.empty}>No closed trades found for this year.</div>
      )}
    </div>
  )
}

function MetricCard({ label, value, color }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color: color || 'var(--text)' }}>{value}</div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: color || 'var(--text)' }}>{value}</div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 16, padding: '0 0 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--mono)' },
  controls: { display: 'flex', gap: 8, alignItems: 'center' },
  select: {
    background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '6px 12px', fontFamily: 'var(--mono)', fontSize: 13, cursor: 'pointer',
  },
  exportBtn: {
    background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 6,
    padding: '6px 16px', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', transition: 'opacity .15s',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '16px 20px',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--mono)' },
  barTrack: { height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, transition: 'width .4s ease' },
  barLabels: { display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  metricCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '14px 18px',
  },
  metricLabel: { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontFamily: 'var(--mono)' },
  metricValue: { fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  stat: { display: 'flex', flexDirection: 'column', gap: 4 },
  statLabel: { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--mono)' },
  statValue: { fontSize: 16, fontWeight: 600, fontFamily: 'var(--mono)' },
  error: { color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 12, padding: '8px 0' },
  muted: { color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 },
  empty: { color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'center', padding: '40px 0' },
  disclaimer: { fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '4px 0' },
}
