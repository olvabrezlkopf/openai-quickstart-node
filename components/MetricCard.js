import styles from './MetricCard.module.css';

export default function MetricCard({ label, value, unit, color }) {
  return (
    <div className={styles.card} style={{ borderTopColor: color || 'var(--color-primary)' }}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
    </div>
  );
}
