import { getMonthGrid, getWeekdayHeaders, isSameDay, toDateString } from '../lib/dates';
import styles from './CalendarGrid.module.css';

export default function CalendarGrid({ year, month, scheduled, onDayClick, selectedDate }) {
  const grid = getMonthGrid(year, month);
  const headers = getWeekdayHeaders();
  const today = new Date();

  function getDotsForDay(date) {
    if (!date) return [];
    const dateStr = toDateString(date);
    return Object.values(scheduled).filter((s) => s.date === dateStr);
  }

  return (
    <div className={styles.grid}>
      {headers.map((h) => (
        <div key={h} className={styles.headerCell}>{h}</div>
      ))}
      {grid.flat().map((date, i) => {
        if (!date) return <div key={`empty-${i}`} className={styles.emptyCell} />;
        const dots = getDotsForDay(date);
        const isToday = isSameDay(date, today);
        const isSelected = selectedDate && isSameDay(date, selectedDate);

        return (
          <button
            key={i}
            className={`${styles.dayCell} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
            onClick={() => onDayClick(date)}
          >
            <span className={styles.dayNum}>{date.getDate()}</span>
            {dots.length > 0 && (
              <div className={styles.dots}>
                {dots.slice(0, 3).map((s) => (
                  <span
                    key={s.id}
                    className={styles.dot}
                    style={{ background: statusColor(s.status) }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function statusColor(status) {
  switch (status) {
    case 'completed': return 'var(--color-status-completed)';
    case 'skipped': return 'var(--color-status-skipped)';
    case 'postponed': return 'var(--color-status-postponed)';
    default: return 'var(--color-status-planned)';
  }
}
