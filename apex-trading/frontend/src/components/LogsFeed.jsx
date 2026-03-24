const LEVEL_COLOR = {
  INFO:     'var(--cyan)',
  WARNING:  '#f59e0b',
  ERROR:    'var(--red)',
  CRITICAL: '#ff3860',
  DEBUG:    'var(--muted)',
}

const AGENT_COLOR = {
  team_leader:      '#a78bfa',
  market_analyst:   'var(--cyan)',
  execution_agent:  'var(--green)',
  risk_manager:     '#f59e0b',
  sentiment_analyst:'#34d399',
  optimizer:        '#60a5fa',
  watchdog:         'var(--red)',
  telegram_bot:     '#38bdf8',
}

export default function LogsFeed({ logs }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>AGENT LOGS</span>
        <span style={styles.hint}>last 60 entries</span>
      </div>
      <div style={styles.list}>
        {!logs?.length ? (
          <div style={styles.empty}>No log entries yet</div>
        ) : (
          logs.map(log => (
            <div key={log.id} style={styles.row}>
              <span style={styles.ts}>{log.timestamp?.slice(11, 19)}</span>
              <span style={{ ...styles.agent, color: AGENT_COLOR[log.agent] ?? 'var(--muted)' }}>
                {log.agent?.replace('_', ' ')}
              </span>
              <span style={{ ...styles.level, color: LEVEL_COLOR[log.level] ?? 'var(--muted)' }}>
                {log.level}
              </span>
              <span style={styles.msg}>{log.message}</span>
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
  hint: { fontSize: 10, color: 'var(--muted)' },
  list: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 320, overflowY: 'auto', fontFamily: 'var(--mono)' },
  row: { display: 'flex', alignItems: 'baseline', gap: 10, padding: '2px 0', fontSize: 11, borderBottom: '1px solid #0d1421' },
  ts: { color: 'var(--muted)', width: 64, flexShrink: 0 },
  agent: { width: 120, flexShrink: 0, fontSize: 10 },
  level: { width: 52, flexShrink: 0, fontSize: 10 },
  msg: { color: 'var(--text)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0', fontFamily: 'inherit' },
}
