function Card({ label, value, sub, color }) {
  return (
    <div style={styles.card}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: color ?? 'var(--cyan)' }}>{value}</span>
      {sub && <span style={styles.sub}>{sub}</span>}
    </div>
  )
}

export default function MetricCards({ perf }) {
  if (!perf) return null
  const pnlColor = perf.total_pnl_eur >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div style={styles.grid}>
      <Card
        label="Total P&L"
        value={`${perf.total_pnl_eur >= 0 ? '+' : ''}€${perf.total_pnl_eur.toFixed(2)}`}
        sub={`${perf.total_trades} closed trades`}
        color={pnlColor}
      />
      <Card
        label="Win Rate"
        value={`${(perf.win_rate * 100).toFixed(1)}%`}
        sub={`Profit factor ${perf.profit_factor === 0 ? '—' : perf.profit_factor.toFixed(2)}x`}
      />
      <Card
        label="Avg Win"
        value={`€${perf.avg_win_eur.toFixed(2)}`}
        sub={`Avg loss €${perf.avg_loss_eur.toFixed(2)}`}
        color="var(--green)"
      />
      <Card
        label="Open Positions"
        value={perf.open_trades}
        sub="of 3 max"
        color="var(--text)"
      />
    </div>
  )
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' },
  value: { fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700 },
  sub: { fontSize: 11, color: 'var(--muted)' },
}
