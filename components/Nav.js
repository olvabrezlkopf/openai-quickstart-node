import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  House,
  ListBullets,
  CalendarBlank,
  NotePencil,
  ChartLineUp,
  GearSix,
} from '@phosphor-icons/react';
import styles from './Nav.module.css';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', Icon: House },
  { href: '/plan', label: 'Pläne', Icon: ListBullets },
  { href: '/calendar', label: 'Kalender', Icon: CalendarBlank },
  { href: '/journal', label: 'Tagebuch', Icon: NotePencil },
  { href: '/analytics', label: 'Analytics', Icon: ChartLineUp },
];

export default function Nav() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  const settingsActive = router.pathname.startsWith('/settings');

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>Mutig</div>
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const isActive = href === '/'
          ? router.pathname === '/'
          : router.pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.icon}>
              <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
            </span>
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
      <div className={styles.spacer} />
      <Link
        href="/settings"
        className={`${styles.link} ${styles.settingsLink} ${settingsActive ? styles.active : ''}`}
      >
        {user?.image ? (
          <img src={user.image} alt="" className={styles.avatar} />
        ) : (
          <span className={styles.icon}>
            <GearSix size={22} weight={settingsActive ? 'fill' : 'regular'} />
          </span>
        )}
        <span className={styles.label}>
          {user?.name?.split(' ')[0] || 'Einstellungen'}
        </span>
      </Link>
    </nav>
  );
}
