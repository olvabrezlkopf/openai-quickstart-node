import { useState } from 'react';
import Head from 'next/head';
import { getSession, useSession } from 'next-auth/react';
import styles from './settings.module.css';

export default function ProfileSettings({ user }) {
  const { update } = useSession();
  const [name, setName] = useState(user.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });

    setSaving(false);
    if (!res.ok) {
      setError('Fehler beim Speichern.');
    } else {
      setSaved(true);
      await update({ name: name.trim() });
    }
  }

  return (
    <>
      <Head><title>Profil — Mutig</title></Head>
      <div className={styles.page}>
        <h1 className={styles.title}>Profil</h1>

        <div className={styles.section}>
          <div className={styles.avatar}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name || ''} />
            ) : (
              <span>{(user.name || user.email)[0].toUpperCase()}</span>
            )}
          </div>
          <p className={styles.avatarHint}>
            Profilbild wird automatisch von Google übernommen oder kann später hochgeladen werden.
          </p>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}
          {saved && <div className={styles.successBanner}>Gespeichert.</div>}

          <div className={styles.field}>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label>E-Mail</label>
            <input type="email" value={user.email} disabled className={styles.disabled} />
            <span className={styles.fieldHint}>E-Mail kann derzeit nicht geändert werden.</span>
          </div>

          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Speichern…' : 'Änderungen speichern'}
          </button>
        </form>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) return { redirect: { destination: '/auth/signin', permanent: false } };

  const { prisma } = await import('../../lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, avatarUrl: true },
  });

  return { props: { user } };
}
