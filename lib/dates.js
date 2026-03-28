/**
 * Build a 6-row × 7-col grid for a given month (Monday-start weeks).
 * Each cell is either a Date or null (padding).
 */
export function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Convert Sunday=0 to Monday=0 system
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const grid = [];
  let day = 1 - startDow;

  for (let row = 0; row < 6; row++) {
    const week = [];
    for (let col = 0; col < 7; col++) {
      if (day >= 1 && day <= lastDay.getDate()) {
        week.push(new Date(year, month, day));
      } else {
        week.push(null);
      }
      day++;
    }
    grid.push(week);
  }
  return grid;
}

const dayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });

export function formatDateDE(date) {
  return dateFormatter.format(date);
}

export function formatMonthDE(year, month) {
  return monthFormatter.format(new Date(year, month, 1));
}

export function getWeekdayHeaders() {
  // Monday through Sunday
  return ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
