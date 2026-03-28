import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Link from 'next/link';
import { useData } from '../../context/DataContext';
import { ADD_LOG, UPDATE_LOG, UPDATE_SCHEDULE } from '../../context/actions';
import { generateId } from '../../lib/ids';
import SudsSlider from '../../components/SudsSlider';
import DifficultyStars from '../../components/DifficultyStars';
import styles from './logDetail.module.css';

export default function LogPage() {
  const router = useRouter();
  const { exposureId } = router.query;
  const { state, dispatch, isHydrated } = useData();

  const [sudsBefore, setSudsBefore] = useState(5);
  const [sudsAfter, setSudsAfter] = useState(3);
  const [note, setNote] = useState('');
  const [completed, setCompleted] = useState(true);
  const [rating, setRating] = useState(3);

  if (!isHydrated || !router.isReady) return null;

  const scheduled = state.scheduled[exposureId];
  if (!scheduled) {
    return (
      <div className={styles.notFound}>
        <p>Exposition nicht gefunden.</p>
        <button onClick={() => router.push('/calendar')} className={styles.backBtn}>Zum Kalender</button>
      </div>
    );
  }

  const item = state.items[scheduled.itemId];
  const existingLog = Object.values(state.logs).find((l) => l.schedId === exposureId);
  const isPrePhase = !existingLog;
  const isPostPhase = existingLog && !existingLog.suds_after && existingLog.suds_after !== 0;
  const isDone = existingLog && (existingLog.suds_after !== undefined && existingLog.suds_after !== null);

  function handleStartLog(e) {
    e.preventDefault();
    const logId = generateId();
    dispatch({
      type: ADD_LOG,
      payload: {
        id: logId,
        schedId: exposureId,
        suds_before: sudsBefore,
        suds_after: null,
        duration_min: null,
        completed: null,
        rating: null,
        started_at: new Date().toISOString(),
        note: note.trim(),
      },
    });
  }

  function handleFinishLog(e) {
    e.preventDefault();
    if (!existingLog) return;
    const startTime = new Date(existingLog.started_at);
    const durationMin = Math.round((Date.now() - startTime.getTime()) / 60000);

    dispatch({
      type: UPDATE_LOG,
      payload: {
        id: existingLog.id,
        suds_after: sudsAfter,
        duration_min: durationMin,
        completed,
        rating,
      },
    });
    dispatch({
      type: UPDATE_SCHEDULE,
      payload: {
        id: exposureId,
        status: completed ? 'completed' : 'skipped',
      },
    });
  }

  function handleSkip() {
    dispatch({
      type: UPDATE_SCHEDULE,
      payload: { id: exposureId, status: 'skipped' },
    });
    router.push('/calendar');
  }

  // Pre-exposure phase
  if (isPrePhase) {
    return (
      <div>
        <Head><title>Pre-Exposure — Mutig</title></Head>
        <button className={styles.backLink} onClick={() => router.push('/calendar')}>← Kalender</button>

        <div className={styles.header}>
          <span className={styles.phase}>Pre-Exposure</span>
          <h1 className={styles.title}>{item?.title || 'Exposition'}</h1>
          {item?.description && <p className={styles.desc}>{item.description}</p>}
        </div>

        <form onSubmit={handleStartLog} className={styles.form}>
          <SudsSlider value={sudsBefore} onChange={setSudsBefore} label="Wie fühlst du dich jetzt? (SUDS)" />

          <label className={styles.formLabel}>
            Kurze Notiz (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Wie geht es dir gerade?"
              className={styles.formTextarea}
              rows={3}
            />
          </label>

          <div className={styles.actions}>
            <button type="submit" className={styles.startBtn}>Start</button>
            <button type="button" className={styles.skipBtn} onClick={handleSkip}>Überspringen</button>
          </div>
        </form>
      </div>
    );
  }

  // Post-exposure phase
  if (isPostPhase) {
    const startTime = new Date(existingLog.started_at);
    const elapsedMin = Math.round((Date.now() - startTime.getTime()) / 60000);

    return (
      <div>
        <Head><title>Post-Exposure — Mutig</title></Head>
        <button className={styles.backLink} onClick={() => router.push('/calendar')}>← Kalender</button>

        <div className={styles.header}>
          <span className={styles.phase}>Post-Exposure</span>
          <h1 className={styles.title}>{item?.title || 'Exposition'}</h1>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span>SUDS vorher</span>
            <strong>{existingLog.suds_before}</strong>
          </div>
          <div className={styles.infoRow}>
            <span>Dauer bisher</span>
            <strong>{elapsedMin} min</strong>
          </div>
        </div>

        <form onSubmit={handleFinishLog} className={styles.form}>
          <SudsSlider value={sudsAfter} onChange={setSudsAfter} label="SUDS jetzt" />

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Durchgehalten?</span>
            <button
              type="button"
              className={`${styles.toggle} ${completed ? styles.toggleOn : styles.toggleOff}`}
              onClick={() => setCompleted(!completed)}
            >
              {completed ? 'Ja' : 'Nein'}
            </button>
          </div>

          <DifficultyStars value={rating} onChange={setRating} label="Wie schwer war es wirklich? (vs. Erwartung)" />

          <button type="submit" className={styles.finishBtn}>Fertig</button>
        </form>
      </div>
    );
  }

  // Done — Summary
  const sudsDrop = existingLog.suds_before - existingLog.suds_after;

  return (
    <div>
      <Head><title>Zusammenfassung — Mutig</title></Head>
      <button className={styles.backLink} onClick={() => router.push('/calendar')}>← Kalender</button>

      <div className={styles.header}>
        <span className={styles.phaseDone}>Abgeschlossen</span>
        <h1 className={styles.title}>{item?.title || 'Exposition'}</h1>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span>SUDS vorher</span>
          <strong>{existingLog.suds_before}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>SUDS nachher</span>
          <strong>{existingLog.suds_after}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>SUDS-Drop</span>
          <strong className={sudsDrop > 0 ? styles.positive : styles.neutral}>
            {sudsDrop > 0 ? `-${sudsDrop}` : sudsDrop}
          </strong>
        </div>
        <div className={styles.summaryRow}>
          <span>Dauer</span>
          <strong>{existingLog.duration_min} min</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>Durchgehalten</span>
          <strong>{existingLog.completed ? 'Ja' : 'Nein'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>Bewertung</span>
          <strong>{'★'.repeat(existingLog.rating)}{'☆'.repeat(5 - existingLog.rating)}</strong>
        </div>
      </div>

      <div className={styles.sudsBar}>
        <div className={styles.sudsBarBefore} style={{ width: `${existingLog.suds_before * 10}%` }} />
        <div className={styles.sudsBarAfter} style={{ width: `${existingLog.suds_after * 10}%` }} />
      </div>
      <div className={styles.sudsBarLabels}>
        <span>Vorher: {existingLog.suds_before}</span>
        <span>Nachher: {existingLog.suds_after}</span>
      </div>

      <Link href="/journal" className={styles.journalLink}>
        Tagebucheintrag schreiben →
      </Link>
    </div>
  );
}
