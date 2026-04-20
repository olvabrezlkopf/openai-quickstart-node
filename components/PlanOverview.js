import { useMemo } from 'react';
import { Check } from '@phosphor-icons/react';
import styles from './PlanOverview.module.css';

export default function PlanOverview({ phases, items, scheduled, logs, journals, onEditItem }) {
  // Build lookup: itemId → { runs, avgDrop, lastRun, latestJournal }
  const stats = useMemo(() => {
    const byItem = new Map();
    items.forEach((i) => byItem.set(i.id, { runs: [], completed: 0, lastRun: null, journals: [] }));

    Object.values(scheduled).forEach((sched) => {
      const rec = byItem.get(sched.itemId);
      if (!rec) return;
      rec.runs.push(sched);
      if (sched.status === 'completed') {
        rec.completed++;
        if (!rec.lastRun || sched.date > rec.lastRun) rec.lastRun = sched.date;
      }
      // Find log for this scheduled
      const log = Object.values(logs).find((l) => l.schedId === sched.id);
      if (log && log.suds_before != null && log.suds_after != null) {
        rec.runs.push({ ...sched, log });
      }
    });

    // Attach journals via logId
    Object.values(journals).forEach((j) => {
      if (!j.logId) return;
      const log = logs[j.logId];
      if (!log) return;
      const sched = scheduled[log.schedId];
      if (!sched) return;
      const rec = byItem.get(sched.itemId);
      if (rec) rec.journals.push(j);
    });

    // Compute avg SUDS drop per item
    const result = {};
    for (const [itemId, rec] of byItem) {
      const logsForItem = rec.runs
        .map((r) => r.log)
        .filter((l) => l && l.suds_before != null && l.suds_after != null);
      const totalDrop = logsForItem.reduce((sum, l) => sum + (l.suds_before - l.suds_after), 0);
      const avgDrop = logsForItem.length > 0 ? +(totalDrop / logsForItem.length).toFixed(1) : null;
      result[itemId] = {
        completed: rec.completed,
        totalRuns: rec.runs.filter((r) => !r.log).length + logsForItem.length,
        avgDrop,
        lastRun: rec.lastRun,
        latestJournal: rec.journals.sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        )[0] || null,
      };
    }
    return result;
  }, [items, scheduled, logs, journals]);

  // Earliest scheduled date per item — used for chronological sorting
  const earliestByItem = useMemo(() => {
    const map = {};
    Object.values(scheduled).forEach((s) => {
      if (!s.itemId) return;
      const key = s.date + 'T' + (s.time || '00:00');
      if (!map[s.itemId] || key < map[s.itemId]) map[s.itemId] = key;
    });
    return map;
  }, [scheduled]);

  function sortByScheduleThenPlan(a, b) {
    const sa = earliestByItem[a.id];
    const sb = earliestByItem[b.id];
    if (sa && sb) return sa.localeCompare(sb);
    if (sa && !sb) return -1;
    if (!sa && sb) return 1;
    return (a.week || 0) - (b.week || 0) || (a.unit || 0) - (b.unit || 0);
  }

  // Group items by phase for rendering
  const phaseGroups = useMemo(() => {
    const map = new Map();
    phases.forEach((p) => map.set(p.id, { phase: p, items: [] }));
    const unassigned = [];
    items.forEach((item) => {
      if (item.phaseId && map.has(item.phaseId)) {
        map.get(item.phaseId).items.push(item);
      } else {
        unassigned.push(item);
      }
    });
    for (const [, group] of map) {
      group.items.sort(sortByScheduleThenPlan);
    }
    unassigned.sort(sortByScheduleThenPlan);
    return { phaseGroups: Array.from(map.values()), unassigned };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases, items, earliestByItem]);

  if (items.length === 0) {
    return <p className={styles.empty}>Noch keine Schritte angelegt.</p>;
  }

  return (
    <div className={styles.wrapper}>
      {phaseGroups.phaseGroups.map(({ phase, items: phaseItems }) => (
        <PhaseTable
          key={phase.id}
          phase={phase}
          items={phaseItems}
          stats={stats}
          scheduled={scheduled}
          onEditItem={onEditItem}
        />
      ))}
      {phaseGroups.unassigned.length > 0 && (
        <PhaseTable
          phase={{ name: 'Ohne Phase' }}
          items={phaseGroups.unassigned}
          stats={stats}
          scheduled={scheduled}
          onEditItem={onEditItem}
        />
      )}
    </div>
  );
}

function findEarliestDate(scheduled, itemId) {
  let earliest = null;
  Object.values(scheduled).forEach((s) => {
    if (s.itemId !== itemId) return;
    if (!earliest || s.date < earliest) earliest = s.date;
  });
  return earliest;
}

function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function PhaseTable({ phase, items, stats, scheduled, onEditItem }) {
  if (items.length === 0) return null;

  return (
    <section className={styles.phase}>
      <h3 className={styles.phaseName}>{phase.name}</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Termin</th>
              <th>W</th>
              <th>E</th>
              <th>Situation / Übung</th>
              <th>Ort</th>
              <th>Dauer</th>
              <th>Schw.</th>
              <th>Done</th>
              <th>Ø Drop</th>
              <th>Letzter Eintrag</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const s = stats[item.id] || {};
              const nextDate = findEarliestDate(scheduled, item.id);
              return (
                <tr key={item.id} onClick={() => onEditItem(item)} className={styles.row}>
                  <td className={styles.small}>{formatShortDate(nextDate)}</td>
                  <td className={styles.small}>{item.week || '-'}</td>
                  <td className={styles.small}>{item.unit || '-'}</td>
                  <td>
                    <div className={styles.titleCell}>{item.title}</div>
                    {item.fokus_beiMir && (
                      <div className={styles.focusCell}>{item.fokus_beiMir}</div>
                    )}
                  </td>
                  <td className={styles.small}>{item.ort || '-'}</td>
                  <td className={styles.small}>{item.dauer || '-'}</td>
                  <td>
                    <span
                      className={styles.sudsPill}
                      style={{ background: sudsColor(item.suds_estimate) }}
                    >
                      {item.suds_estimate}
                    </span>
                  </td>
                  <td className={styles.small}>
                    {s.completed > 0 ? (
                      <span className={styles.doneBadge}>
                        <Check size={11} weight="bold" />
                        {s.completed}×
                      </span>
                    ) : (
                      <span className={styles.notDone}>—</span>
                    )}
                  </td>
                  <td className={styles.small}>
                    {s.avgDrop != null ? (
                      <span className={s.avgDrop > 0 ? styles.positive : styles.neutral}>
                        {s.avgDrop > 0 ? `-${s.avgDrop}` : s.avgDrop}
                      </span>
                    ) : '—'}
                  </td>
                  <td className={styles.journalCell}>
                    {s.latestJournal ? (
                      <div className={styles.journalSnippet}>
                        {s.latestJournal.content?.gut_angefuehlt ||
                         s.latestJournal.content?.was_gelernt ||
                         s.latestJournal.content?.bei_mir_geblieben ||
                         '(Eintrag vorhanden)'}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function sudsColor(val) {
  if (val <= 3) return 'var(--color-suds-0)';
  if (val <= 6) return 'var(--color-suds-5)';
  return 'var(--color-suds-10)';
}
