import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0d1421', border: '1px solid #1a2535', borderRadius: 6, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, color: '#00e5ff' }}>
        €{payload[0].value?.toFixed(2)}
      </div>
      {payload[1] && (
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: payload[1].value >= 0 ? '#00ff88' : '#ff3860' }}>
          {payload[1].value >= 0 ? '+' : ''}€{payload[1].value?.toFixed(2)} P&L
        </div>
      )}
    </div>
  )
}

export default function EquityChart({ snapshots }) {
  if (!snapshots?.length) {
    return (
      <div style={styles.empty}>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>No snapshot data yet — equity chart will appear after the first trading day</span>
      </div>
    )
  }

  const data = snapshots.map(s => ({
    date: s.date?.slice(5),  // MM-DD
    equity: s.equity_eur,
    pnl: s.daily_pnl,
  }))

  const minEquity = Math.min(...data.map(d => d.equity)) * 0.995
  const maxEquity = Math.max(...data.map(d => d.equity)) * 1.005

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>EQUITY CURVE</span>
        <span style={styles.sub}>{snapshots.length}d</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fill: '#6b7a99', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
          <YAxis domain={[minEquity, maxEquity]} tick={{ fill: '#6b7a99', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v.toFixed(0)}`} width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="equity" stroke="#00e5ff" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="pnl" stroke="#00ff8866" strokeWidth={1} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const styles = {
  wrap: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' },
  sub: { fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' },
  empty: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}
