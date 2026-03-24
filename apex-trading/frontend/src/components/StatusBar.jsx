export default function StatusBar({ status, perf, onPause, onResume }) {
  const paused = status?.paused
  const equity = perf?.equity_eur ?? 0
  const dailyPnl = perf?.daily_pnl_eur ?? 0
  const pnlColor = dailyPnl >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <span style={styles.logo}>APEX</span>
        <span style={styles.sub}>Trading System</span>
      </div>

      <div style={styles.center}>
        <div style={styles.stat}>
          <span style={styles.label}>EQUITY</span>
          <span style={styles.value}>€{equity.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={styles.divider} />
        <div style={styles.stat}>
          <span style={styles.label}>TODAY</span>
          <span style={{ ...styles.value, color: pnlColor }}>
            {dailyPnl >= 0 ? '+' : ''}{dailyPnl.toFixed(2)} EUR
          </span>
        </div>
        <div style={styles.divider} />
        <div style={styles.stat}>
          <span style={styles.label}>WIN RATE</span>
          <span style={styles.value}>{((perf?.win_rate ?? 0) * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div style={styles.right}>
        <div style={{ ...styles.badge, background: paused ? '#ff386022' : '#00ff8822', color: paused ? 'var(--red)' : 'var(--green)', borderColor: paused ? 'var(--red)' : 'var(--green)' }}>
          {paused ? '⏸ PAUSED' : '▶ LIVE'}
        </div>
        <button
          style={{ ...styles.btn, background: paused ? '#00ff8822' : '#ff386022', color: paused ? 'var(--green)' : 'var(--red)', borderColor: paused ? 'var(--green)' : 'var(--red)' }}
          onClick={paused ? onResume : onPause}
        >
          {paused ? 'RESUME' : 'PAUSE'}
        </button>
      </div>
    </header>
  )
}

const styles = {
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 },
  left: { display: 'flex', alignItems: 'baseline', gap: 8 },
  logo: { fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 4 },
  sub: { fontSize: 11, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' },
  center: { display: 'flex', alignItems: 'center', gap: 16 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  label: { fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' },
  value: { fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text)' },
  divider: { width: 1, height: 28, background: 'var(--border)' },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  badge: { padding: '4px 10px', borderRadius: 4, border: '1px solid', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: 1 },
  btn: { padding: '5px 14px', borderRadius: 4, border: '1px solid', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: 1, cursor: 'pointer', background: 'transparent' },
}
