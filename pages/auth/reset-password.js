import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './auth.module.css';

ResetPassword.noShell = true;

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleRequest(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase() }),
    });

    setLoading(false);
    setDone(true);
  }

  async function handleReset(e) {
    e.preventDefault();
    if (password.length < 8) { setError('Passwort muss mindestens 8 Zeichen lang sein.'); return; }
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/confirm-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.message || 'Link ungültig oder abgelaufen.');
    } else {
      router.push('/auth/signin?reset=1');
    }
  }

  if (token) {
    return (
      <>
        <Head><title>Neues Passwort — Mutig</title></Head>
        <div className={styles.page}>
          <div className={styles.card}>
            <div className={styles.logo}>Mutig</div>
            <h1 className={styles.heading}>Neues Passwort setzen</h1>
            {error && <div className={styles.errorBanner}>{error}</div>}
            <form onSubmit={handleReset} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="password">Neues Passwort (min. 8 Zeichen)</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Speichern…' : 'Passwort speichern'}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Passwort zurücksetzen — Mutig</title></Head>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>Mutig</div>
          <h1 className={styles.heading}>Passwort vergessen?</h1>

          {done ? (
            <div className={styles.successBanner}>
              Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link geschickt. Bitte überprüfe auch deinen Spam-Ordner.
            </div>
          ) : (
            <form onSubmit={handleRequest} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="email">E-Mail-Adresse</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="du@beispiel.de"
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Sende Link…' : 'Reset-Link senden'}
              </button>
            </form>
          )}

          <p className={styles.switchLink}>
            <Link href="/auth/signin">← Zurück zum Login</Link>
          </p>
        </div>
      </div>
    </>
  );
}
