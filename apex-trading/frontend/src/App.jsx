import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import StatusBar from './components/StatusBar'
import MetricCards from './components/MetricCards'
import EquityChart from './components/EquityChart'
import PositionsTable from './components/PositionsTable'
import SignalsFeed from './components/SignalsFeed'
import TradesTable from './components/TradesTable'
import LogsFeed from './components/LogsFeed'
import TaxTab from './components/TaxTab'

const POLL_INTERVAL = 10_000  // 10 seconds
const TABS = ['Dashboard', 'Tax Report']

export default function App() {
  const [activeTab, setActiveTab]   = useState('Dashboard')
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

      {/* Tab navigation */}
      <div style={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <main style={styles.main}>
        {activeTab === 'Dashboard' && (
          <>
            <MetricCards perf={perf} />
            <EquityChart snapshots={snapshots} />
            <div style={styles.row2}>
              <PositionsTable trades={openTrades} />
              <SignalsFeed signals={signals} />
            </div>
            <TradesTable trades={trades} />
            <LogsFeed logs={logs} />
            {lastUpdate && (
              <div style={styles.footer}>
                Last updated {lastUpdate} · auto-refresh every {POLL_INTERVAL / 1000}s
              </div>
            )}
          </>
        )}

        {activeTab === 'Tax Report' && (
          <TaxTab />
        )}
      </main>
    </div>
  )
}

const styles = {
  app: { minHeight: '100vh', background: 'var(--bg)' },
  errorBanner: {
    background: '#ff386015', borderBottom: '1px solid #ff386040',
    padding: '8px 24px', fontSize: 12, color: 'var(--red)', fontFamily: 'var(--mono)',
  },
  tabBar: {
    display: 'flex', gap: 0, borderBottom: '1px solid var(--border)',
    padding: '0 24px', background: 'var(--bg)',
  },
  tab: {
    background: 'none', border: 'none', borderBottom: '2px solid transparent',
    color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500,
    padding: '10px 18px', cursor: 'pointer', transition: 'color .15s, border-color .15s',
    marginBottom: -1,
  },
  tabActive: {
    color: 'var(--cyan)', borderBottomColor: 'var(--cyan)',
  },
  main: {
    padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
    maxWidth: 1400, margin: '0 auto',
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  footer: {
    fontSize: 11, color: 'var(--muted)', textAlign: 'center',
    padding: '8px 0 16px', fontFamily: 'var(--mono)',
  },
}
