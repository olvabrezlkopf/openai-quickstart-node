import Link from 'next/link';
import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { calcStreak, calcAvgSudsDrop } from '../lib/stats';
import { Target, Lightning, TrendUp, ArrowRight } from '@phosphor-icons/react';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { state, isHydrated } = useData();

  const data = useMemo(() => {
    if (!isHydrated) return null;
    const plans = Object.values(state.plans);
    const scheduled = Object.values(state.scheduled);
    const logs = Object.values(state.logs);

    const today = new Date().toISOString().slice(0, 10);
    const next = scheduled
      .filter((s) => s.status === 'planned' && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const nextItem = next ? state.items[next.itemId] : null;

    const streak = calcStreak(state.scheduled);
    const completedCount = scheduled.filter((s) => s.status === 'completed').length;
    const avgDrop = calcAvgSudsDrop(state.logs);

    return { plans, next, nextItem, streak, completedCount, avgDrop, totalLogs: logs.length };
  }, [state, isHydrated]);

  if (!isHydrated || !data) return null;

  const feedback = getFeedback(data);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Lightning size={18} weight="fill" className={styles.headerIcon} />
        <span>Quick Coach</span>
      </div>

      {data.plans.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <Target size={15} weight="bold" /> Deine Ziele
          </h3>
          <ul className={styles.goalList}>
            {data.plans.slice(0, 3).map((p) => (
              <li key={p.id} className={styles.goalItem}>
                <Link href={`/plan/${p.id}`} className={styles.goalLink}>
                  <span className={styles.goalName}>{p.name}</span>
                  {p.goal && <span className={styles.goalDesc}>{p.goal.slice(0, 60)}{p.goal.length > 60 ? '...' : ''}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.nextItem && data.next && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Nächster Schritt</h3>
          <Link href={`/log/${data.next.id}`} className={styles.nextCard}>
            <span className={styles.nextTitle}>{data.nextItem.title}</span>
            <span className={styles.nextDate}>
              {new Date(data.next.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
              {data.next.time ? ` · ${data.next.time}` : ''}
            </span>
            <span className={styles.nextArrow}><ArrowRight size={14} weight="bold" /></span>
          </Link>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <TrendUp size={15} weight="bold" /> Auf einen Blick
        </h3>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{data.streak}</span>
            <span className={styles.statLabel}>Tage Serie</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{data.completedCount}</span>
            <span className={styles.statLabel}>Geschafft</span>
          </div>
          {data.avgDrop > 0 && (
            <div className={styles.stat}>
              <span className={styles.statValue}>-{data.avgDrop}</span>
              <span className={styles.statLabel}>Ø Drop</span>
            </div>
          )}
        </div>
      </section>

      <div className={styles.feedback}>
        <p className={styles.feedbackText}>{feedback}</p>
      </div>
    </aside>
  );
}

function getFeedback({ streak, completedCount, avgDrop }) {
  if (completedCount === 0) return 'Starte deine erste Challenge — jeder Schritt zählt!';
  if (streak >= 7) return `${streak} Tage am Stück — du baust eine echte Routine auf!`;
  if (streak >= 3) return `${streak} Tage in Folge aktiv — starke Serie!`;
  if (avgDrop >= 3) return `Ø ${avgDrop} Punkte weniger Anspannung — das zeigt echten Fortschritt.`;
  if (completedCount >= 10) return `${completedCount} Challenges gemeistert — beeindruckend!`;
  if (completedCount === 1) return 'Erster Schritt geschafft! Der Anfang ist gemacht.';
  return `${completedCount} Challenges absolviert — weiter so!`;
}
