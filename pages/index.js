import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';
import styles from './index.module.css';
import { useData } from '../context/DataContext';
import { calcStreak, calcCompletionRate, calcAvgSudsDrop } from '../lib/stats';
import MetricCard from '../components/MetricCard';

export default function Dashboard() {
  const { state, isHydrated } = useData();

  const streak = useMemo(() => calcStreak(state.scheduled), [state.scheduled]);
  const completionRate = useMemo(() => calcCompletionRate(state.scheduled), [state.scheduled]);
  const avgDrop = useMemo(() => calcAvgSudsDrop(state.logs), [state.logs]);

  const nextExposure = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return Object.values(state.scheduled)
      .filter((s) => s.status === 'planned' && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0] || null;
  }, [state.scheduled]);

  const recentActivity = useMemo(() => {
    const completed = Object.values(state.scheduled)
      .filter((s) => s.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    return completed;
  }, [state.scheduled]);

  if (!isHydrated) return <div className={styles.skeleton} />;

  const hasData = Object.keys(state.scheduled).length > 0;

  return (
    <div>
      <Head>
        <title>Mutig — Dein Expositions-Coach</title>
      </Head>

      <div className={styles.hero}>
        <img
          className={styles.heroImg}
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80&auto=format&fit=crop"
          alt=""
          loading="lazy"
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>Mutig</span>
          <h1 className={styles.title}>Dein Weg. Dein Tempo.</h1>
          <p className={styles.subtitle}>
            Kleine Schritte, klare Spuren. Schau dir an, wo du stehst — und was als nächstes dran ist.
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Willkommen bei Mutig</p>
          <p>Erstelle deinen ersten Expositionsplan und beginne deine Reise.</p>
          <Link href="/plan" className={styles.ctaButton}>Ersten Plan erstellen</Link>
        </div>
      ) : (
        <>
          <div className={styles.metrics}>
            <MetricCard
              label="Streak"
              value={streak}
              unit={streak === 1 ? 'Tag' : 'Tage'}
              color="var(--color-primary)"
            />
            <MetricCard
              label="Completion Rate"
              value={completionRate}
              unit="%"
              color="var(--color-success)"
            />
            <MetricCard
              label="Ø SUDS-Drop"
              value={avgDrop}
              unit="Punkte"
              color="var(--color-warning)"
            />
          </div>

          {nextExposure && (
            <div className={styles.nextUp}>
              <span className={styles.nextUpTitle}>Nächste Exposition</span>
              <p className={styles.nextUpItem}>
                {state.items[nextExposure.itemId]?.title || 'Unbekannt'}
              </p>
              <p className={styles.nextUpDate}>
                {new Date(nextExposure.date + 'T00:00').toLocaleDateString('de-DE', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })} um {nextExposure.time}
              </p>
              <Link href={`/log/${nextExposure.id}`} className={styles.ctaButton} style={{ marginTop: '12px' }}>
                Jetzt starten
              </Link>
            </div>
          )}

          {recentActivity.length > 0 && (
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                Letzte Aktivitäten
              </h2>
              <ul className={styles.recentList}>
                {recentActivity.map((sched) => (
                  <li key={sched.id} className={styles.recentItem}>
                    <span className={styles.recentTitle}>
                      {state.items[sched.itemId]?.title || 'Unbekannt'}
                    </span>
                    <span className={styles.recentMeta}>
                      {new Date(sched.date + 'T00:00').toLocaleDateString('de-DE', {
                        day: 'numeric', month: 'short'
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
