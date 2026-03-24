import { useState } from 'react'

export default function TradesTable({ trades }) {
  const [filter, setFilter] = useState('closed')
  const shown = trades?.filter(t => t.status === filter) ?? []

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>TRADE HISTORY</span>
        <div style={styles.tabs}>
          {['closed', 'liquidated'].map(f => (
            <button key={f} style={{ ...styles.tab, color: filter === f ? 'var(--cyan)' : 'var(--muted)', borderColor: filter === f ? 'var(--cyan)' : 'transparent' }} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {!shown.length ? (
        <div style={styles.empty}>No {filter} trades</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Asset', 'Side', 'Entry', 'Exit', 'P&L', 'Lev', 'Hours', 'Closed'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 50).map(t => {
                const pnl = t.pnl_eur ?? 0
                return (
                  <tr key={t.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontFamily: 'var(--mono)', color: 'var(--cyan)' }}>{t.asset}</td>
                    <td style={{ ...styles.td, color: t.side === 'LONG' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)', fontSize: 11 }}>{t.side}</td>
                    <td style={{ ...styles.td, fontFamily: 'var(--mono)' }}>${t.entry_price?.toFixed(2)}</td>
                    <td style={{ ...styles.td, fontFamily: 'var(--mono)' }}>${t.exit_price?.toFixed(2) ?? '—'}</td>
                    <td style={{ ...styles.td, fontFamily: 'var(--mono)', color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {pnl >= 0 ? '+' : ''}€{pnl.toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, fontFamily: 'var(--mono)' }}>{t.leverage}x</td>
                    <td style={{ ...styles.td, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{t.holding_hours?.toFixed(1)}h</td>
                    <td style={{ ...styles.td, color: 'var(--muted)', fontSize: 11 }}>{t.timestamp_close?.slice(0, 10)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' },
  tabs: { display: 'flex', gap: 4 },
  tab: { background: 'transparent', border: '1px solid', borderRadius: 4, padding: '3px 10px', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: 1, textTransform: 'uppercase' },
  empty: { color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'left', paddingBottom: 8, borderBottom: '1px solid var(--border)', fontWeight: 400, paddingRight: 16 },
  tr: { borderBottom: '1px solid #0d1421' },
  td: { padding: '7px 16px 7px 0', fontSize: 12, color: 'var(--text)' },
}
