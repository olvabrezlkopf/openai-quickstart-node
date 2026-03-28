import styles from './ExposureItemCard.module.css';

export default function ExposureItemCard({ item, onEdit, onSchedule }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.suds} style={{ color: sudsColor(item.suds_estimate) }}>
          {item.suds_estimate}
        </span>
        <div className={styles.info}>
          <h3 className={styles.title}>{item.title}</h3>
          {item.category && <span className={styles.badge}>{item.category}</span>}
        </div>
        <div className={styles.stars}>
          {'★'.repeat(item.difficulty)}{'☆'.repeat(5 - item.difficulty)}
        </div>
      </div>
      {item.description && <p className={styles.desc}>{item.description}</p>}
      <div className={styles.actions}>
        {onEdit && <button className={styles.btn} onClick={() => onEdit(item)}>Bearbeiten</button>}
        {onSchedule && <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onSchedule(item)}>Termin planen</button>}
      </div>
    </div>
  );
}

function sudsColor(val) {
  if (val <= 3) return 'var(--color-suds-0)';
  if (val <= 6) return 'var(--color-suds-5)';
  return 'var(--color-suds-10)';
}
