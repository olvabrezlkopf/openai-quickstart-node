export default function PositionsTable({ trades }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>OPEN POSITIONS</span>
        <span style={styles.count}>{trades?.length ?? 0} / 3</span>
      </div>
      {!trades?.length ? (
        <div style={styles.empty}>No open positions</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['Asset', 'Side', 'Entry', 'Size', 'Lev', 'Opened'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.id} style={styles.tr}>
                <td style={{ ...styles.td, fontFamily: 'var(--mono)', color: 'var(--cyan)' }}>{t.asset}</td>
                <td style={{ ...styles.td, color: t.side === 'LONG' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)', fontSize: 11 }}>{t.side}</td>
                <td style={{ ...styles.td, fontFamily: 'var(--mono)' }}>${t.entry_price?.toLocaleString()}</td>
                <td style={{ ...styles.td, fontFamily: 'var(--mono)' }}>{t.size?.toFixed(4)}</td>
                <td style={{ ...styles.td, fontFamily: 'var(--mono)' }}>{t.leverage}x</td>
                <td style={{ ...styles.td, color: 'var(--muted)', fontSize: 11 }}>{t.timestamp_open?.slice(11, 16)} UTC</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const styles = {
  wrap: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' },
  count: { fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--cyan)' },
  empty: { color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'left', paddingBottom: 8, borderBottom: '1px solid var(--border)', fontWeight: 400 },
  tr: { borderBottom: '1px solid #0d1421' },
  td: { padding: '8px 0', paddingRight: 12, fontSize: 12, color: 'var(--text)' },
}
