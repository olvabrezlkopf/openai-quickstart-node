import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import StatusBar from './components/StatusBar'
import MetricCards from './components/MetricCards'
import EquityChart from './components/EquityChart'
import PositionsTable from './components/PositionsTable'
import SignalsFeed from './components/SignalsFeed'
import TradesTable from './components/TradesTable'
import LogsFeed from './components/LogsFeed'

const POLL_INTERVAL = 10_000  // 10 seconds

export default function App() {
  const [status, setStatus]         = useState(null)
  const [perf, setPerf]             = useState(null)
  const [snapshots, setSnapshots]   = useState([])
  const [openTrades, setOpenTrades] = useState([])
  const [trades, setTrades]         = useState([])
  const [signals, setSignals]       = useState([])
  const [logs, setLogs]             = useState([])
  const [error, setError]           = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const [s, p, snaps, ot, t, sig, l] = await Promise.all([
        api.status(),
        api.performance(),
        api.snapshots(),
        api.openTrades(),
        api.trades(),
        api.signals(),
        api.logs(),
      ])
      setStatus(s)
      setPerf(p)
      setSnapshots(snaps)
      setOpenTrades(ot)
      setTrades(t)
      setSignals(sig)
      setLogs(l)
      setError(null)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [refresh])

  async function handlePause() {
    await api.pause()
    await refresh()
  }

  async function handleResume() {
    await api.resume()
    await refresh()
  }

  return (
    <div style={styles.app}>
      <StatusBar status={status} perf={perf} onPause={handlePause} onResume={handleResume} />

      {error && (
        <div style={styles.errorBanner}>
          Backend unavailable: {error} — retrying every {POLL_INTERVAL / 1000}s
        </div>
      )}

      <main style={styles.main}>
        {/* Row 1: Metric cards */}
        <MetricCards perf={perf} />

        {/* Row 2: Equity chart */}
        <EquityChart snapshots={snapshots} />

        {/* Row 3: Positions + Signals */}
        <div style={styles.row2}>
          <PositionsTable trades={openTrades} />
          <SignalsFeed signals={signals} />
        </div>

        {/* Row 4: Trade history */}
        <TradesTable trades={trades} />

        {/* Row 5: Agent logs */}
        <LogsFeed logs={logs} />

        {lastUpdate && (
          <div style={styles.footer}>
            Last updated {lastUpdate} · auto-refresh every {POLL_INTERVAL / 1000}s
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  app: { minHeight: '100vh', background: 'var(--bg)' },
  main: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, margin: '0 auto' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  errorBanner: { background: '#ff386015', borderBottom: '1px solid #ff386040', padding: '8px 24px', fontSize: 12, color: 'var(--red)', fontFamily: 'var(--mono)' },
  footer: { fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '8px 0 16px', fontFamily: 'var(--mono)' },
}
