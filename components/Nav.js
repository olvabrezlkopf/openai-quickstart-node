import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Nav.module.css';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/plan', label: 'Pläne', icon: '☰' },
  { href: '/calendar', label: 'Kalender', icon: '▦' },
  { href: '/journal', label: 'Tagebuch', icon: '✎' },
];

export default function Nav() {
  const router = useRouter();

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>Mutig</div>
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/'
          ? router.pathname === '/'
          : router.pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.link} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
