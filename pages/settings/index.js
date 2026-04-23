import Head from 'next/head';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { User, Buildings, CreditCard, ShieldCheck, SignOut } from '@phosphor-icons/react';
import styles from './settings.module.css';

const ITEMS = [
  { href: '/settings/profile', label: 'Profil', desc: 'Name und Profilbild', Icon: User },
  { href: '/settings/workspace', label: 'Workspace', desc: 'Mitglieder und Einladungen', Icon: Buildings },
  { href: '/settings/billing', label: 'Abonnement', desc: 'Plan und Rechnungen', Icon: CreditCard },
  { href: '/settings/account', label: 'Konto', desc: 'Passwort, Export, Konto löschen', Icon: ShieldCheck },
];

export default function SettingsIndex() {
  const { data: session } = useSession();

  return (
    <>
      <Head><title>Einstellungen — Mutig</title></Head>
      <div className={styles.page}>
        <h1 className={styles.title}>Einstellungen</h1>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {ITEMS.map(({ href, label, desc, Icon }) => (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-gray-100)',
              textDecoration: 'none', color: 'inherit',
              transition: 'background 0.15s, border-color 0.15s',
            }}>
              <Icon size={22} weight="regular" style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>{label}</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-400)' }}>{desc}</p>
              </div>
            </Link>
          ))}
        </nav>

        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
            marginTop: 'var(--space-2xl)', padding: 'var(--space-sm) var(--space-md)',
            background: 'none', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)',
            color: '#dc2626', fontSize: 'var(--font-size-sm)', fontWeight: 500, cursor: 'pointer',
          }}
        >
          <SignOut size={18} weight="bold" />
          Abmelden
        </button>
      </div>
    </>
  );
}
