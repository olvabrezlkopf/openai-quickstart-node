import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from './auth.module.css';

export default function SignUp() {
  const router = useRouter();
  const { invite } = router.query;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tos, setTos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!tos) { setError('Bitte stimme den Nutzungsbedingungen zu.'); return; }
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen lang sein.'); return; }

    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: email.toLowerCase(), password, invite }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message || 'Registrierung fehlgeschlagen.');
      setLoading(false);
      return;
    }

    await signIn('credentials', {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });

    router.push('/onboarding');
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn('google', { callbackUrl: invite ? `/onboarding?invite=${invite}` : '/onboarding' });
  }

  return (
    <>
      <Head>
        <title>Registrieren — Mutig</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>Mutig</div>
          <h1 className={styles.heading}>Konto erstellen</h1>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <button
            className={styles.socialBtn}
            onClick={handleGoogle}
            disabled={loading}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Mit Google registrieren
          </button>

          <div className={styles.divider}><span>oder</span></div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dein Name"
                required
                autoComplete="name"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="email">E-Mail</label>
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
            <div className={styles.field}>
              <label htmlFor="password">Passwort (min. 8 Zeichen)</label>
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
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={tos}
                onChange={e => setTos(e.target.checked)}
              />
              <span>
                Ich akzeptiere die{' '}
                <Link href="/legal/agb" target="_blank">AGB</Link>{' '}
                und{' '}
                <Link href="/legal/datenschutz" target="_blank">Datenschutzerklärung</Link>
              </span>
            </label>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Erstelle Konto…' : 'Konto erstellen'}
            </button>
          </form>

          <p className={styles.switchLink}>
            Bereits registriert?{' '}
            <Link href="/auth/signin">Anmelden</Link>
          </p>
        </div>
      </div>
    </>
  );
}

SignUp.noShell = true;

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (session) return { redirect: { destination: '/', permanent: false } };
  return { props: {} };
}
