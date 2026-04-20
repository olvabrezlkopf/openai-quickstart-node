import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useData } from '../../context/DataContext';
import { ADD_LOG, UPDATE_LOG, UPDATE_SCHEDULE, ADD_JOURNAL, UPDATE_JOURNAL } from '../../context/actions';
import { generateId } from '../../lib/ids';
import { MOODS } from '../../lib/constants';
import SudsSlider from '../../components/SudsSlider';
import DifficultyStars from '../../components/DifficultyStars';
import MoodPicker from '../../components/MoodPicker';
import { PencilSimple } from '@phosphor-icons/react';
import styles from './logDetail.module.css';

export default function LogPage() {
  const router = useRouter();
  const { exposureId } = router.query;
  const { state, dispatch, isHydrated } = useData();

  // Pre phase state
  const [sudsBefore, setSudsBefore] = useState(5);
  const [preNote, setPreNote] = useState('');
  const [editingPre, setEditingPre] = useState(false);

  // Post phase state
  const [sudsAfter, setSudsAfter] = useState(3);
  const [completed, setCompleted] = useState(true);
  const [rating, setRating] = useState(3);

  // Journal state (Deep Mode — connected to log)
  const [journalMode, setJournalMode] = useState(false);
  const [wasGelernt, setWasGelernt] = useState('');
  const [beiMirGeblieben, setBeiMirGeblieben] = useState('');
  const [anspruch, setAnspruch] = useState('');
  const [gutAngefuehlt, setGutAngefuehlt] = useState('');
  const [zielNaechste, setZielNaechste] = useState('');
  const [mood, setMood] = useState(2);

  const existingLog = isHydrated && exposureId
    ? Object.values(state.logs).find((l) => l.schedId === exposureId)
    : null;
  const existingJournal = existingLog
    ? Object.values(state.journals).find((j) => j.logId === existingLog.id)
    : null;

  // Pre-fill edit mode with existing values
  useEffect(() => {
    if (editingPre && existingLog) {
      setSudsBefore(existingLog.suds_before);
      setPreNote(existingLog.note || '');
    }
  }, [editingPre, existingLog]);

  // Pre-fill journal form with existing journal if available
  useEffect(() => {
    if (journalMode && existingJournal) {
      setWasGelernt(existingJournal.content?.was_gelernt || '');
      setBeiMirGeblieben(existingJournal.content?.bei_mir_geblieben || '');
      setAnspruch(existingJournal.content?.anspruch || '');
      setGutAngefuehlt(existingJournal.content?.gut_angefuehlt || '');
      setZielNaechste(existingJournal.content?.ziel_naechste || '');
      setMood(existingJournal.mood ?? 2);
    }
  }, [journalMode, existingJournal]);

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
  const isPrePhase = !existingLog;
  const isPostPhase = existingLog && (existingLog.suds_after === null || existingLog.suds_after === undefined);
  const isDone = existingLog && existingLog.suds_after !== null && existingLog.suds_after !== undefined;

  function handleStartLog(e) {
    e.preventDefault();
    dispatch({
      type: ADD_LOG,
      payload: {
        id: generateId(),
        schedId: exposureId,
        suds_before: sudsBefore,
        suds_after: null,
        duration_min: null,
        completed: null,
        rating: null,
        started_at: new Date().toISOString(),
        note: preNote.trim(),
      },
    });
  }

  function handleEditPre(e) {
    e.preventDefault();
    if (!existingLog) return;
    dispatch({
      type: UPDATE_LOG,
      payload: {
        id: existingLog.id,
        suds_before: sudsBefore,
        note: preNote.trim(),
      },
    });
    setEditingPre(false);
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
      payload: { id: exposureId, status: completed ? 'completed' : 'skipped' },
    });
    // Auto-open journal
    setJournalMode(true);
  }

  function handleSaveJournal(e) {
    e.preventDefault();
    if (!existingLog) return;

    const payload = {
      mode: 'exposure',
      content: {
        was_gelernt: wasGelernt.trim(),
        bei_mir_geblieben: beiMirGeblieben.trim(),
        anspruch: anspruch.trim(),
        gut_angefuehlt: gutAngefuehlt.trim(),
        ziel_naechste: zielNaechste.trim(),
      },
      mood,
      logId: existingLog.id,
      schedId: exposureId,
      itemId: scheduled.itemId,
    };

    if (existingJournal) {
      dispatch({
        type: UPDATE_JOURNAL,
        payload: { id: existingJournal.id, ...payload },
      });
    } else {
      dispatch({
        type: ADD_JOURNAL,
        payload: {
          id: generateId(),
          ...payload,
          created_at: new Date().toISOString(),
          tags: [],
        },
      });
    }
    setJournalMode(false);
  }

  function handleSkip() {
    dispatch({ type: UPDATE_SCHEDULE, payload: { id: exposureId, status: 'skipped' } });
    router.push('/calendar');
  }

  // === PRE-EXPOSURE PHASE ===
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
              value={preNote}
              onChange={(e) => setPreNote(e.target.value)}
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

  // === POST-EXPOSURE PHASE ===
  if (isPostPhase) {
    // Edit pre mode
    if (editingPre) {
      return (
        <div>
          <Head><title>Pre bearbeiten — Mutig</title></Head>
          <button className={styles.backLink} onClick={() => setEditingPre(false)}>← Zurück</button>
          <div className={styles.header}>
            <span className={styles.phase}>Pre bearbeiten</span>
            <h1 className={styles.title}>{item?.title || 'Exposition'}</h1>
          </div>
          <form onSubmit={handleEditPre} className={styles.form}>
            <SudsSlider value={sudsBefore} onChange={setSudsBefore} label="SUDS vorher" />
            <label className={styles.formLabel}>
              Notiz (optional)
              <textarea
                value={preNote}
                onChange={(e) => setPreNote(e.target.value)}
                className={styles.formTextarea}
                rows={3}
              />
            </label>
            <button type="submit" className={styles.startBtn}>Speichern</button>
          </form>
        </div>
      );
    }

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
          {existingLog.note && (
            <div className={styles.infoRow}>
              <span>Notiz vorher</span>
              <span className={styles.infoNote}>{existingLog.note}</span>
            </div>
          )}
          <div className={styles.infoRow}>
            <span>Dauer bisher</span>
            <strong>{elapsedMin} min</strong>
          </div>
          <button type="button" className={styles.editPreBtn} onClick={() => setEditingPre(true)}>
            <PencilSimple size={14} weight="bold" /> Pre-Werte anpassen
          </button>
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

  // === DONE — Journal mode or Summary ===
  const sudsDrop = existingLog.suds_before - existingLog.suds_after;

  if (journalMode) {
    return (
      <div>
        <Head><title>Tagebuch — Mutig</title></Head>
        <button className={styles.backLink} onClick={() => setJournalMode(false)}>← Zurück</button>

        <div className={styles.header}>
          <span className={styles.phaseJournal}>Tagebucheintrag</span>
          <h1 className={styles.title}>{item?.title || 'Exposition'}</h1>
          <p className={styles.desc}>1 Satz reicht pro Feld — mehr braucht es nicht.</p>
        </div>

        <form onSubmit={handleSaveJournal} className={styles.form}>
          <label className={styles.formLabel}>
            Was hat mein Nervensystem heute gelernt?
            <textarea
              value={wasGelernt}
              onChange={(e) => setWasGelernt(e.target.value)}
              className={styles.formTextarea}
              rows={2}
              placeholder="Eine Erkenntnis..."
            />
          </label>
          <label className={styles.formLabel}>
            Moment wo ich bei mir geblieben bin
            <textarea
              value={beiMirGeblieben}
              onChange={(e) => setBeiMirGeblieben(e.target.value)}
              className={styles.formTextarea}
              rows={2}
              placeholder="..."
            />
          </label>
          <label className={styles.formLabel}>
            Hatte ich einen Anspruch an mich?
            <textarea
              value={anspruch}
              onChange={(e) => setAnspruch(e.target.value)}
              className={styles.formTextarea}
              rows={2}
              placeholder="..."
            />
          </label>
          <label className={styles.formLabel}>
            Was hat sich gut angefühlt?
            <textarea
              value={gutAngefuehlt}
              onChange={(e) => setGutAngefuehlt(e.target.value)}
              className={styles.formTextarea}
              rows={2}
              placeholder="..."
            />
          </label>
          <label className={styles.formLabel}>
            Ziel nächste Woche
            <input
              type="text"
              value={zielNaechste}
              onChange={(e) => setZielNaechste(e.target.value)}
              className={styles.formInput}
              placeholder="z.B. Länger bleiben"
            />
          </label>
          <MoodPicker value={mood} onChange={setMood} label="Stimmung" />
          <button type="submit" className={styles.finishBtn}>
            {existingJournal ? 'Speichern' : 'Eintrag speichern'}
          </button>
        </form>
      </div>
    );
  }

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
          <strong>{'★'.repeat(existingLog.rating || 0)}{'☆'.repeat(5 - (existingLog.rating || 0))}</strong>
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

      {existingJournal ? (
        <div className={styles.journalCard}>
          <div className={styles.journalHeader}>
            <span>Tagebucheintrag {MOODS[existingJournal.mood] || ''}</span>
            <button className={styles.editLink} onClick={() => setJournalMode(true)}>Bearbeiten</button>
          </div>
          {existingJournal.content?.was_gelernt && (
            <p className={styles.journalField}>
              <strong>Gelernt:</strong> {existingJournal.content.was_gelernt}
            </p>
          )}
          {existingJournal.content?.bei_mir_geblieben && (
            <p className={styles.journalField}>
              <strong>Bei mir geblieben:</strong> {existingJournal.content.bei_mir_geblieben}
            </p>
          )}
          {existingJournal.content?.gut_angefuehlt && (
            <p className={styles.journalField}>
              <strong>Gut angefühlt:</strong> {existingJournal.content.gut_angefuehlt}
            </p>
          )}
          {existingJournal.content?.ziel_naechste && (
            <p className={styles.journalField}>
              <strong>Nächstes Ziel:</strong> {existingJournal.content.ziel_naechste}
            </p>
          )}
        </div>
      ) : (
        <button className={styles.journalLink} onClick={() => setJournalMode(true)}>
          Tagebucheintrag schreiben →
        </button>
      )}
    </div>
  );
}
