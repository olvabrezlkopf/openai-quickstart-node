import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { prisma } from '../../lib/prisma';
import styles from './onboarding.module.css';

Onboarding.noShell = true;

export default function Onboarding({ workspaceName: initialName, workspaceId }) {
  const router = useRouter();
  const [name, setName] = useState(initialName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Bitte gib deinem Workspace einen Namen.'); return; }
    setError('');
    setLoading(true);

    const res = await fetch('/api/workspace/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, name: name.trim() }),
    });

    if (!res.ok) {
      setError('Fehler beim Speichern.');
      setLoading(false);
      return;
    }

    router.push('/');
  }

  return (
    <>
      <Head>
        <title>Willkommen bei Mutig</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.step}>Schritt 1 von 1</div>
          <h1 className={styles.heading}>Dein Workspace</h1>
          <p className={styles.sub}>
            Gib deinem persönlichen Bereich einen Namen. Du kannst ihn später jederzeit ändern.
          </p>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="wsname">Workspace-Name</label>
              <input
                id="wsname"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z.B. Mein Mutprojekt"
                required
                autoFocus
              />
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Weiter…' : 'Loslegen →'}
            </button>
          </form>

          <p className={styles.hint}>
            Du kannst danach direkt deinen ersten Trainingsplan erstellen oder das Demo-Projekt laden.
          </p>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) return { redirect: { destination: '/auth/signin', permanent: false } };

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id, role: 'ADMIN' },
    include: { workspace: true },
    orderBy: { joinedAt: 'asc' },
  });

  if (!member) return { redirect: { destination: '/', permanent: false } };

  return {
    props: {
      workspaceName: member.workspace.name,
      workspaceId: member.workspace.id,
    },
  };
}
