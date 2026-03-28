import Head from 'next/head';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useData } from '../../context/DataContext';
import { SCHEDULE_EXPOSURE, UPDATE_SCHEDULE } from '../../context/actions';
import { generateId } from '../../lib/ids';
import { formatMonthDE, toDateString, formatDateDE } from '../../lib/dates';
import { STATUS_LABELS } from '../../lib/constants';
import CalendarGrid from '../../components/CalendarGrid';
import Modal from '../../components/Modal';
import styles from './index.module.css';

export default function CalendarPage() {
  const router = useRouter();
  const { state, dispatch, isHydrated } = useData();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [schedTime, setSchedTime] = useState('10:00');
  const [schedNotes, setSchedNotes] = useState('');

  if (!isHydrated) return null;

  const preselectedItemId = router.query.itemId || '';

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const dayExposures = selectedDate
    ? Object.values(state.scheduled).filter((s) => s.date === toDateString(selectedDate))
    : [];

  function getItemTitle(itemId) {
    const item = state.items[itemId];
    return item ? item.title : 'Unbekannt';
  }

  function openScheduleModal() {
    setSelectedItemId(preselectedItemId || Object.keys(state.items)[0] || '');
    setSchedTime('10:00');
    setSchedNotes('');
    setShowScheduleModal(true);
  }

  function handleSchedule(e) {
    e.preventDefault();
    if (!selectedItemId || !selectedDate) return;
    dispatch({
      type: SCHEDULE_EXPOSURE,
      payload: {
        id: generateId(),
        itemId: selectedItemId,
        date: toDateString(selectedDate),
        time: schedTime,
        status: 'planned',
        notes: schedNotes.trim(),
      },
    });
    setShowScheduleModal(false);
  }

  const allItems = Object.values(state.items);

  return (
    <div>
      <Head><title>Kalender — Mutig</title></Head>

      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevMonth}>‹</button>
        <h1 className={styles.monthTitle}>{formatMonthDE(year, month)}</h1>
        <button className={styles.navBtn} onClick={nextMonth}>›</button>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        scheduled={state.scheduled}
        selectedDate={selectedDate}
        onDayClick={(d) => setSelectedDate(d)}
      />

      {selectedDate && (
        <div className={styles.dayPanel}>
          <h2 className={styles.dayTitle}>{formatDateDE(selectedDate)}</h2>
          {dayExposures.length === 0 ? (
            <p className={styles.noExposures}>Keine Expositionen geplant.</p>
          ) : (
            <ul className={styles.exposureList}>
              {dayExposures.map((sched) => (
                <li key={sched.id} className={styles.exposureItem}>
                  <div className={styles.exposureInfo}>
                    <span className={styles.exposureTitle}>{getItemTitle(sched.itemId)}</span>
                    <span className={styles.exposureTime}>{sched.time}</span>
                  </div>
                  <span
                    className={styles.statusBadge}
                    style={{ background: statusBg(sched.status) }}
                  >
                    {STATUS_LABELS[sched.status]}
                  </span>
                  {sched.status === 'planned' && (
                    <button
                      className={styles.logBtn}
                      onClick={() => router.push(`/log/${sched.id}`)}
                    >
                      Loggen
                    </button>
                  )}
                  {sched.status === 'completed' && (
                    <button
                      className={styles.viewBtn}
                      onClick={() => router.push(`/log/${sched.id}`)}
                    >
                      Ansehen
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button className={styles.scheduleBtn} onClick={openScheduleModal}>
            + Exposition planen
          </button>
        </div>
      )}

      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Exposition planen"
      >
        <form onSubmit={handleSchedule} className={styles.form}>
          <label className={styles.formLabel}>
            Expositionsschritt
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className={styles.formSelect}
            >
              {allItems.length === 0 && <option value="">Keine Schritte vorhanden</option>}
              {allItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} (SUDS {item.suds_estimate})
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formLabel}>
            Datum
            <input
              type="text"
              readOnly
              value={selectedDate ? formatDateDE(selectedDate) : ''}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            Uhrzeit
            <input
              type="time"
              value={schedTime}
              onChange={(e) => setSchedTime(e.target.value)}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            Notizen
            <textarea
              value={schedNotes}
              onChange={(e) => setSchedNotes(e.target.value)}
              placeholder="Optionale Notizen..."
              className={styles.formTextarea}
              rows={2}
            />
          </label>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!selectedItemId || allItems.length === 0}
          >
            Planen
          </button>
        </form>
      </Modal>
    </div>
  );
}

function statusBg(status) {
  switch (status) {
    case 'completed': return 'var(--color-status-completed)';
    case 'skipped': return 'var(--color-status-skipped)';
    case 'postponed': return 'var(--color-status-postponed)';
    default: return 'var(--color-status-planned)';
  }
}
