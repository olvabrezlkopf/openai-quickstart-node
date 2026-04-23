import { useState } from 'react';
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import styles from './settings.module.css';

export default function AccountSettings({ hasPassword }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  const [exportLoading, setExportLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPw.length < 8) { setPwMsg({ type: 'error', text: 'Mindestens 8 Zeichen.' }); return; }
    setPwLoading(true);
    setPwMsg({ type: '', text: '' });

    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
    });

    setPwLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setPwMsg({ type: 'error', text: data.message || 'Fehler.' });
    } else {
      setPwMsg({ type: 'success', text: 'Passwort geändert.' });
      setOldPw('');
      setNewPw('');
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await fetch('/api/user/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mutig-daten-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export fehlgeschlagen.');
    }
    setExportLoading(false);
  }

  async function handleDelete() {
    if (deleteConfirm !== 'LÖSCHEN') {
      setDeleteError('Bitte tippe LÖSCHEN ein um fortzufahren.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');

    const res = await fetch('/api/user/delete', { method: 'DELETE' });
    if (!res.ok) {
      setDeleteError('Fehler beim Löschen. Bitte kontaktiere den Support.');
      setDeleteLoading(false);
      return;
    }
    signOut({ callbackUrl: '/auth/signin' });
  }

  return (
    <>
      <Head><title>Konto — Mutig</title></Head>
      <div className={styles.page}>
        <h1 className={styles.title}>Konto</h1>

        {hasPassword && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Passwort ändern</h2>
            <form onSubmit={handlePasswordChange} className={styles.form}>
              {pwMsg.text && (
                <div className={pwMsg.type === 'error' ? styles.errorBanner : styles.successBanner}>
                  {pwMsg.text}
                </div>
              )}
              <div className={styles.field}>
                <label htmlFor="oldPw">Aktuelles Passwort</label>
                <input
                  id="oldPw"
                  type="password"
                  value={oldPw}
                  onChange={e => setOldPw(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="newPw">Neues Passwort (min. 8 Zeichen)</label>
                <input
                  id="newPw"
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className={styles.saveBtn} disabled={pwLoading}>
                {pwLoading ? 'Speichern…' : 'Passwort ändern'}
              </button>
            </form>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Daten exportieren (DSGVO Art. 20)</h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-md)' }}>
            Lade alle deine Daten als JSON-Datei herunter.
          </p>
          <button onClick={handleExport} className={styles.saveBtn} disabled={exportLoading}>
            {exportLoading ? 'Exportiere…' : 'Daten exportieren'}
          </button>
        </section>

        <section className={styles.dangerSection}>
          <h2 className={styles.dangerTitle}>Konto löschen</h2>
          <p className={styles.dangerText}>
            Alle deine Daten werden innerhalb von 30 Tagen unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          {deleteError && <div className={styles.errorBanner} style={{ marginBottom: 'var(--space-md)' }}>{deleteError}</div>}
          <div className={styles.field} style={{ marginBottom: 'var(--space-md)' }}>
            <label htmlFor="deleteConfirm">Tippe <strong>LÖSCHEN</strong> ein um fortzufahren</label>
            <input
              id="deleteConfirm"
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="LÖSCHEN"
              autoComplete="off"
            />
          </div>
          <button
            onClick={handleDelete}
            className={styles.dangerBtn}
            disabled={deleteLoading || deleteConfirm !== 'LÖSCHEN'}
          >
            {deleteLoading ? 'Lösche Konto…' : 'Konto endgültig löschen'}
          </button>
        </section>
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
    select: { passwordHash: true },
  });

  return { props: { hasPassword: !!user?.passwordHash } };
}
