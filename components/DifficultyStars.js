import styles from './DifficultyStars.module.css';

export default function DifficultyStars({ value, onChange, label = 'Schwierigkeit' }) {
  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`${styles.star} ${n <= value ? styles.filled : ''}`}
            onClick={() => onChange(n)}
            aria-label={`${n} von 5`}
          >
            {n <= value ? '★' : '☆'}
          </button>
        ))}
      </div>
    </div>
  );
}
