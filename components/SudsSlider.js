import styles from './SudsSlider.module.css';

export default function SudsSlider({ value, onChange, label = 'Anspannung' }) {
  const pct = (value / 10) * 100;

  return (
    <div className={styles.wrapper}>
      <div className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value} style={{ color: sudsColor(value) }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
        style={{
          background: `linear-gradient(to right, var(--color-suds-0) 0%, var(--color-suds-5) 50%, var(--color-suds-10) 100%)`,
        }}
      />
      <div className={styles.ticks}>
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}

function sudsColor(val) {
  if (val <= 3) return 'var(--color-suds-0)';
  if (val <= 6) return 'var(--color-suds-5)';
  return 'var(--color-suds-10)';
}
