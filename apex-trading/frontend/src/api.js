const BASE = '/api'

async function get(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

async function post(path) {
  const res = await fetch(BASE + path, { method: 'POST' })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

export const api = {
  status:      () => get('/status'),
  performance: (days = 30) => get(`/performance?days=${days}`),
  snapshots:   (days = 30) => get(`/snapshots?days=${days}`),
  trades:      (status) => get(`/trades${status ? `?status=${status}` : ''}`),
  openTrades:  () => get('/trades/open'),
  signals:     (limit = 40) => get(`/signals?limit=${limit}`),
  logs:        (limit = 60) => get(`/logs?limit=${limit}`),
  sentiment:   (limit = 20) => get(`/sentiment?limit=${limit}`),
  optimizer:   (limit = 10) => get(`/optimizer?limit=${limit}`),
  pause:       () => post('/pause'),
  resume:      () => post('/resume'),
}
