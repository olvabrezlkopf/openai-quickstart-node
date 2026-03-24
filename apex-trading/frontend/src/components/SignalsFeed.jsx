const STATUS_COLOR = {
  pending:    'var(--muted)',
  processing: 'var(--cyan)',
  executed:   'var(--green)',
  rejected:   'var(--red)',
  failed:     '#ff6b35',
}

const STATUS_DOT = {
  pending:    '○',
  processing: '◌',
  executed:   '●',
  rejected:   '✕',
  failed:     '⚠',
}

export default function SignalsFeed({ signals }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>SIGNALS</span>
        <span style={styles.count}>{signals?.length ?? 0}</span>
      </div>
      <div style={styles.list}>
        {!signals?.length ? (
          <div style={styles.empty}>No signals yet</div>
        ) : (
          signals.slice(0, 20).map(s => (
            <div key={s.id} style={styles.row}>
              <span style={{ color: STATUS_COLOR[s.status] ?? 'var(--muted)', fontSize: 12, width: 14 }}>
                {STATUS_DOT[s.status] ?? '○'}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--cyan)', width: 40 }}>{s.asset}</span>
              <span style={{ fontSize: 11, color: s.side === 'LONG' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)', width: 38 }}>{s.side}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', width: 36, fontFamily: 'var(--mono)' }}>{(s.confidence * 100).toFixed(0)}%</span>
              <span style={{ fontSize: 10, color: STATUS_COLOR[s.status] ?? 'var(--muted)', flex: 1 }}>{s.status}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{s.timestamp?.slice(11, 16)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  wrap: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' },
  count: { fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' },
  list: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', borderBottom: '1px solid #0d1421' },
  empty: { color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' },
}
