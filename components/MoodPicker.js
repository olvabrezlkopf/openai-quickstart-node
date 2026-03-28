import { MOODS } from '../lib/constants';
import styles from './MoodPicker.module.css';

export default function MoodPicker({ value, onChange, label = 'Stimmung' }) {
  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.moods}>
        {MOODS.map((emoji, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.mood} ${value === i ? styles.selected : ''}`}
            onClick={() => onChange(i)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
