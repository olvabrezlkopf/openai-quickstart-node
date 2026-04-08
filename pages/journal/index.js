import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { MOODS } from '../../lib/constants';
import styles from './index.module.css';

export default function JournalPage() {
  const { state, isHydrated } = useData();

  const entries = useMemo(() => {
    if (!isHydrated) return [];
    return Object.values(state.journals)
      .map((j) => {
        const log = j.logId ? state.logs[j.logId] : null;
        const sched = log ? state.scheduled[log.schedId] : null;
        const item = sched ? state.items[sched.itemId] : null;
        return { journal: j, log, sched, item };
      })
      .sort((a, b) => new Date(b.journal.created_at) - new Date(a.journal.created_at));
  }, [state, isHydrated]);

  if (!isHydrated) return null;

  return (
    <div>
      <Head><title>Tagebuch — Mutig</title></Head>

      <h1 className={styles.title}>Tagebuch</h1>
      <p className={styles.subtitle}>
        Dein Beweis, dass du wächst — jeder Eintrag ist mit einer Übung verknüpft.
      </p>

      {entries.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Noch keine Einträge</p>
          <p className={styles.emptyHint}>
            Tagebucheinträge entstehen nach jeder abgeschlossenen Exposition.
            Plane eine Übung im Kalender und fülle nach dem Logger den Eintrag aus.
          </p>
          <Link href="/calendar" className={styles.ctaBtn}>Zum Kalender</Link>
        </div>
      ) : (
        <div className={styles.entryList}>
          {entries.map(({ journal, log, sched, item }) => (
            <div key={journal.id} className={styles.entry}>
              <div className={styles.entryHeader}>
                <div className={styles.entryDate}>
                  {new Date(journal.created_at).toLocaleDateString('de-DE', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </div>
                {item && (
                  <Link href={sched ? `/log/${sched.id}` : '#'} className={styles.entryLink}>
                    {item.title}
                  </Link>
                )}
                <span className={styles.entryMood}>{MOODS[journal.mood] ?? ''}</span>
              </div>

              {log && log.suds_before != null && log.suds_after != null && (
                <div className={styles.sudsRow}>
                  <span className={styles.sudsLabel}>SUDS:</span>
                  <span className={styles.sudsBefore}>{log.suds_before}</span>
                  <span className={styles.sudsArrow}>→</span>
                  <span className={styles.sudsAfter}>{log.suds_after}</span>
                  {log.suds_before > log.suds_after && (
                    <span className={styles.sudsDrop}>
                      (-{log.suds_before - log.suds_after})
                    </span>
                  )}
                  {log.duration_min != null && (
                    <span className={styles.duration}>· {log.duration_min} min</span>
                  )}
                </div>
              )}

              <div className={styles.entryFields}>
                {journal.content?.was_gelernt && (
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Was mein Nervensystem gelernt hat</div>
                    <div className={styles.fieldValue}>{journal.content.was_gelernt}</div>
                  </div>
                )}
                {journal.content?.bei_mir_geblieben && (
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Bei mir geblieben</div>
                    <div className={styles.fieldValue}>{journal.content.bei_mir_geblieben}</div>
                  </div>
                )}
                {journal.content?.anspruch && (
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Anspruch an mich</div>
                    <div className={styles.fieldValue}>{journal.content.anspruch}</div>
                  </div>
                )}
                {journal.content?.gut_angefuehlt && (
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Gut angefühlt</div>
                    <div className={styles.fieldValue}>{journal.content.gut_angefuehlt}</div>
                  </div>
                )}
                {journal.content?.ziel_naechste && (
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Ziel nächste Woche</div>
                    <div className={styles.fieldValue}>{journal.content.ziel_naechste}</div>
                  </div>
                )}
                {/* Legacy quick-mode fields */}
                {journal.content?.wichtigstes && (
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Wichtigstes</div>
                    <div className={styles.fieldValue}>{journal.content.wichtigstes}</div>
                  </div>
                )}
                {journal.content?.mitnehmen && (
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Mitnehmen</div>
                    <div className={styles.fieldValue}>{journal.content.mitnehmen}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
