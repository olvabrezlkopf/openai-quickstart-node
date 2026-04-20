import { toDateString } from './dates';
import { generateId } from './ids';

// Monday-indexed weekday slots. We spread units across the week so things
// don't land on the same day.
const UNIT_TO_WEEKDAY = {
  1: 1, // Monday
  2: 3, // Wednesday
  3: 5, // Friday
  4: 2, // Tuesday
  5: 4, // Thursday
  6: 6, // Saturday
};

/**
 * Return the Date for the Monday of the week that starts on or after `from`.
 * If `from` is already Monday, that Monday is returned.
 */
export function nextMonday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const dow = d.getDay(); // 0=Sun..6=Sat
  // Convert to Mon=0..Sun=6
  const monIdx = (dow + 6) % 7;
  const addDays = monIdx === 0 ? 0 : 7 - monIdx;
  d.setDate(d.getDate() + addDays);
  return d;
}

/**
 * Given a normalized items map (keyed by id) with week/unit fields, produce
 * one scheduled entry per item, auto-distributed across days.
 *
 * Week 1 starts at `startDate` (should be a Monday). Units within a week map
 * to distinct weekdays via UNIT_TO_WEEKDAY.
 *
 * Returns a map of { [scheduledId]: scheduledEntry } ready to merge into state.
 */
export function autoScheduleItems(items, startDate = nextMonday(), defaultTime = '10:00') {
  const out = {};
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  Object.values(items).forEach((item) => {
    const week = Math.max(1, Number(item.week) || 1);
    const unit = Math.max(1, Number(item.unit) || 1);
    const offsetFromStart = (week - 1) * 7;
    const weekdayOffset = (UNIT_TO_WEEKDAY[unit] ?? 1) - 1; // Monday=0
    const date = new Date(start);
    date.setDate(start.getDate() + offsetFromStart + weekdayOffset);

    const id = generateId();
    out[id] = {
      id,
      itemId: item.id,
      date: toDateString(date),
      time: defaultTime,
      status: 'planned',
      notes: '',
    };
  });

  return out;
}
