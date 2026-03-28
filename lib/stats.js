/**
 * Calculate consecutive days streak of completed exposures (going backward from today).
 */
export function calcStreak(scheduled) {
  const completedDates = new Set();
  Object.values(scheduled).forEach((s) => {
    if (s.status === 'completed') completedDates.add(s.date);
  });

  let streak = 0;
  const d = new Date();
  // Check today first
  while (true) {
    const key = toDateKey(d);
    if (completedDates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (streak === 0) {
      // Allow checking yesterday if nothing done today yet
      d.setDate(d.getDate() - 1);
      const yKey = toDateKey(d);
      if (completedDates.has(yKey)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Completion rate: completed / (completed + skipped) as percentage.
 */
export function calcCompletionRate(scheduled) {
  let completed = 0;
  let skipped = 0;
  Object.values(scheduled).forEach((s) => {
    if (s.status === 'completed') completed++;
    else if (s.status === 'skipped') skipped++;
  });
  const total = completed + skipped;
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Average SUDS drop across all completed logs.
 */
export function calcAvgSudsDrop(logs) {
  const completed = Object.values(logs).filter(
    (l) => l.suds_before != null && l.suds_after != null
  );
  if (completed.length === 0) return 0;
  const totalDrop = completed.reduce((sum, l) => sum + (l.suds_before - l.suds_after), 0);
  return +(totalDrop / completed.length).toFixed(1);
}

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
