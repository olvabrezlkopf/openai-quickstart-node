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
import { CaretLeft, CaretRight, Plus, DotsSixVertical, Clock } from '@phosphor-icons/react';
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
  const [draggingId, setDraggingId] = useState(null);

  const allScheduled = useMemo(() => {
    if (!isHydrated) return [];
    const todayStr = toDateString(new Date());
    return Object.values(state.scheduled).sort((a, b) => {
      const aIsUpcoming = a.date >= todayStr;
      const bIsUpcoming = b.date >= todayStr;
      if (aIsUpcoming && !bIsUpcoming) return -1;
      if (!aIsUpcoming && bIsUpcoming) return 1;
      if (aIsUpcoming) {
        return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '');
      }
      return b.date.localeCompare(a.date);
    });
  }, [state.scheduled, isHydrated]);

  if (!isHydrated) return null;

  const preselectedItemId = router.query.itemId || '';
  const hasEvents = allScheduled.length > 0;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const dayExposures = selectedDate
    ? allScheduled.filter((s) => s.date === toDateString(selectedDate))
    : [];

  function getItemTitle(itemId) {
    const item = state.items[itemId];
    return item ? item.title : 'Unbekannt';
  }

  function openScheduleModal() {
    if (!selectedDate) setSelectedDate(new Date());
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

  // --- Drag & drop rescheduling ---
  function handleDragStart(e, schedId) {
    e.dataTransfer.setData('text/plain', schedId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(schedId);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  function handleDropOnDay(schedId, newDate) {
    const existing = state.scheduled[schedId];
    if (!existing || existing.date === newDate) return;
    dispatch({
      type: UPDATE_SCHEDULE,
      payload: { id: schedId, date: newDate },
    });
  }

  const allItems = Object.values(state.items);
  const todayStr = toDateString(new Date());

  return (
    <div className={hasEvents ? styles.layoutTwoCol : styles.layoutSingle}>
      <Head><title>Kalender — Mutig</title></Head>

      {hasEvents && (
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Termine</h2>
          <p className={styles.sidebarHint}>Ziehe Termine auf einen anderen Tag, um sie zu verschieben.</p>
          <ul className={styles.eventList}>
            {allScheduled.map((sched, idx) => {
              const item = state.items[sched.itemId];
              const isToday = sched.date === todayStr;
              const isPast = sched.date < todayStr;
              const isDragging = draggingId === sched.id;
              return (
                <li
                  key={sched.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, sched.id)}
                  onDragEnd={handleDragEnd}
                  className={`${styles.eventItem} ${isPast ? styles.eventPast : ''} ${isToday ? styles.eventToday : ''} ${isDragging ? styles.dragging : ''}`}
                  style={{ animationDelay: `${Math.min(idx * 30, 600)}ms` }}
                  onClick={() => router.push(`/log/${sched.id}`)}
                >
                  <span className={styles.dragHandle} aria-hidden="true">
                    <DotsSixVertical size={14} weight="bold" />
                  </span>
                  <div className={styles.eventDate}>
                    <span className={styles.eventDay}>
                      {new Date(sched.date + 'T00:00').getDate()}
                    </span>
                    <span className={styles.eventMonth}>
                      {new Date(sched.date + 'T00:00').toLocaleDateString('de-DE', { month: 'short' })}
                    </span>
                  </div>
                  <div className={styles.eventBody}>
                    <span className={styles.eventTitle}>{item?.title || 'Unbekannt'}</span>
                    <div className={styles.eventMeta}>
                      <Clock size={11} weight="bold" />
                      <span>{sched.time}</span>
                      <span
                        className={styles.eventStatus}
                        style={{ background: statusBg(sched.status) }}
                      >
                        {STATUS_LABELS[sched.status]}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      )}

      <section className={styles.main}>
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={prevMonth} aria-label="Vorheriger Monat">
            <CaretLeft size={18} weight="bold" />
          </button>
          <h1 className={styles.monthTitle}>{formatMonthDE(year, month)}</h1>
          <button className={styles.navBtn} onClick={nextMonth} aria-label="Nächster Monat">
            <CaretRight size={18} weight="bold" />
          </button>
        </div>

        <CalendarGrid
          year={year}
          month={month}
          scheduled={state.scheduled}
          selectedDate={selectedDate}
          onDayClick={(d) => setSelectedDate(d)}
          onDropOnDay={handleDropOnDay}
        />

        <button className={styles.scheduleBtn} onClick={openScheduleModal}>
          <Plus size={16} weight="bold" />
          <span>Challenge planen {selectedDate ? `(${formatDateDE(selectedDate)})` : ''}</span>
        </button>

        {selectedDate && dayExposures.length > 0 && (
          <div className={styles.dayPanel}>
            <h2 className={styles.dayTitle}>{formatDateDE(selectedDate)}</h2>
            <ul className={styles.exposureList}>
              {dayExposures.map((sched) => (
                <li key={sched.id} className={styles.exposureItem}>
                  <div className={styles.exposureInfo}>
                    <span className={styles.exposureTitle}>{getItemTitle(sched.itemId)}</span>
                    <span className={styles.exposureTime}>{sched.time}</span>
                  </div>
                  <button
                    className={styles.logBtn}
                    onClick={() => router.push(`/log/${sched.id}`)}
                  >
                    Öffnen
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Challenge planen"
      >
        <form onSubmit={handleSchedule} className={styles.form}>
          <label className={styles.formLabel}>
            Übung wählen
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className={styles.formSelect}
            >
              {allItems.length === 0 && <option value="">Keine Schritte vorhanden</option>}
              {allItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} (Level {item.suds_estimate})
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
