import Head from 'next/head';
import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { ADD_JOURNAL } from '../../context/actions';
import { generateId } from '../../lib/ids';
import { MOODS } from '../../lib/constants';
import MoodPicker from '../../components/MoodPicker';
import styles from './index.module.css';

export default function JournalPage() {
  const { state, dispatch, isHydrated } = useData();
  const [wichtigstes, setWichtigstes] = useState('');
  const [mitnehmen, setMitnehmen] = useState('');
  const [mood, setMood] = useState(2);
  const [showMore, setShowMore] = useState(false);

  if (!isHydrated) return null;

  const journals = Object.values(state.journals)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const displayJournals = showMore ? journals : journals.slice(0, 10);

  function handleSubmit(e) {
    e.preventDefault();
    if (!wichtigstes.trim() && !mitnehmen.trim()) return;

    dispatch({
      type: ADD_JOURNAL,
      payload: {
        id: generateId(),
        logId: null,
        mode: 'quick',
        content: {
          wichtigstes: wichtigstes.trim(),
          mitnehmen: mitnehmen.trim(),
        },
        mood,
        created_at: new Date().toISOString(),
        tags: [],
      },
    });
    setWichtigstes('');
    setMitnehmen('');
    setMood(2);
  }

  return (
    <div>
      <Head><title>Tagebuch — Mutig</title></Head>

      <h1 className={styles.title}>Tagebuch</h1>
      <p className={styles.subtitle}>Quick Mode — 60 Sekunden Reflexion</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.formLabel}>
          Was war das Wichtigste?
          <textarea
            value={wichtigstes}
            onChange={(e) => setWichtigstes(e.target.value)}
            placeholder="Die eine Sache die heute zählt..."
            className={styles.formTextarea}
            rows={3}
          />
        </label>

        <label className={styles.formLabel}>
          Was nimmst du mit?
          <textarea
            value={mitnehmen}
            onChange={(e) => setMitnehmen(e.target.value)}
            placeholder="Deine wichtigste Erkenntnis..."
            className={styles.formTextarea}
            rows={3}
          />
        </label>

        <MoodPicker value={mood} onChange={setMood} label="Wie fühlst du dich?" />

        <button type="submit" className={styles.submitBtn}>Eintrag speichern</button>
      </form>

      {journals.length > 0 && (
        <div className={styles.history}>
          <h2 className={styles.historyTitle}>Einträge</h2>
          {displayJournals.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryHeader}>
                <span className={styles.entryMood}>{MOODS[entry.mood] || '😐'}</span>
                <span className={styles.entryDate}>
                  {new Date(entry.created_at).toLocaleDateString('de-DE', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
              </div>
              {entry.content.wichtigstes && (
                <p className={styles.entryText}>
                  <strong>Wichtigstes:</strong> {entry.content.wichtigstes}
                </p>
              )}
              {entry.content.mitnehmen && (
                <p className={styles.entryText}>
                  <strong>Mitnehmen:</strong> {entry.content.mitnehmen}
                </p>
              )}
            </div>
          ))}
          {journals.length > 10 && !showMore && (
            <button className={styles.moreBtn} onClick={() => setShowMore(true)}>
              Mehr laden ({journals.length - 10} weitere)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
