export function getSessionData(state) {
  const sessions = [];
  for (const log of Object.values(state.logs)) {
    if (log.suds_before == null || log.suds_after == null) continue;
    const sched = log.schedId ? state.scheduled[log.schedId] : null;
    const item = sched ? state.items[sched.itemId] : null;
    const phase = item?.phaseId ? state.phases[item.phaseId] : null;
    const plan = phase ? state.plans[phase.planId] : (item?.planId ? state.plans[item.planId] : null);

    sessions.push({
      date: sched?.date || log.started_at?.slice(0, 10) || '',
      before: log.suds_before,
      after: log.suds_after,
      ratio: log.suds_before > 0 ? Math.round((log.suds_after / log.suds_before) * 100) : 0,
      drop: log.suds_before - log.suds_after,
      category: item?.category || plan?.category || 'Andere',
      title: item?.title || 'Unbenannt',
      duration: log.duration_min,
    });
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  return sessions;
}

export function movingAverage(values, window = 5) {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

export function weekAverage(sessions, first) {
  if (sessions.length === 0) return 0;
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const ref = first ? sorted[0].date : sorted[sorted.length - 1].date;
  const refMs = new Date(ref).getTime();
  const week = 7 * 86400000;
  const filtered = sorted.filter((s) => {
    const ms = new Date(s.date).getTime();
    return first ? ms <= refMs + week : ms >= refMs - week;
  });
  if (filtered.length === 0) return 0;
  return Math.round(filtered.reduce((s, x) => s + x.ratio, 0) / filtered.length);
}
