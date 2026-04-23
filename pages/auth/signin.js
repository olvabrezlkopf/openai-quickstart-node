import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from './auth.module.css';

export default function SignIn() {
  const router = useRouter();
  const { error, callbackUrl } = router.query;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const errorMessages = {
    CredentialsSignin: 'E-Mail oder Passwort falsch.',
    OAuthAccountNotLinked: 'Dieses Konto ist mit einem anderen Anmeldeverfahren verknüpft.',
    default: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
  };

  const displayError = error ? (errorMessages[error] ?? errorMessages.default) : formError;

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email: email.toLowerCase(),
      password,
      redirect: false,
      callbackUrl: callbackUrl || '/',
    });

    if (result?.error) {
      setFormError(errorMessages.CredentialsSignin);
      setLoading(false);
    } else {
      router.push(result?.url || '/');
    }
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn('google', { callbackUrl: callbackUrl || '/' });
  }

  return (
    <>
      <Head>
        <title>Anmelden — Mutig</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>Mutig</div>
          <h1 className={styles.heading}>Willkommen zurück</h1>

          {displayError && (
            <div className={styles.errorBanner}>{displayError}</div>
          )}

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
            Mit Google fortfahren
          </button>

          <div className={styles.divider}><span>oder</span></div>

          <form onSubmit={handleSubmit} className={styles.form}>
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
              <label htmlFor="password">
                Passwort
                <Link href="/auth/reset-password" className={styles.forgotLink}>
                  Vergessen?
                </Link>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>

          <p className={styles.switchLink}>
            Noch kein Konto?{' '}
            <Link href="/auth/signup">Jetzt registrieren</Link>
          </p>
        </div>
      </div>
    </>
  );
}

SignIn.noShell = true;

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (session) return { redirect: { destination: '/', permanent: false } };
  return { props: {} };
}
