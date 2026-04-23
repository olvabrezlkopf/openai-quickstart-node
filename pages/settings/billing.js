import Head from 'next/head';
import { getSession } from 'next-auth/react';
import styles from './settings.module.css';

export default function BillingSettings({ plan, status, trialEndsAt }) {
  const planLabels = { FREE: 'Free', PRO: 'Pro', TEAM: 'Team' };
  const statusLabels = {
    TRIALING: 'Trial',
    ACTIVE: 'Aktiv',
    PAST_DUE: 'Zahlung ausstehend',
    CANCELED: 'Gekündigt',
    INCOMPLETE: 'Unvollständig',
  };

  const trialDays = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  async function handleManage() {
    const res = await fetch('/api/billing/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  async function handleUpgrade() {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'PRO' }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <>
      <Head><title>Abonnement — Mutig</title></Head>
      <div className={styles.page}>
        <h1 className={styles.title}>Abonnement</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Aktueller Plan</h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
            padding: 'var(--space-lg)', background: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-lg)',
          }}>
            <div>
              <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                {planLabels[plan] || plan}
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                Status: {statusLabels[status] || status}
                {trialDays !== null && status === 'TRIALING' && ` · Noch ${trialDays} Tage`}
              </p>
            </div>
          </div>

          {plan === 'FREE' && (
            <button onClick={handleUpgrade} className={styles.saveBtn}>
              Auf Pro upgraden
            </button>
          )}

          {plan !== 'FREE' && (
            <button onClick={handleManage} className={styles.saveBtn} style={{ background: 'var(--color-gray-700)' }}>
              Abonnement verwalten (Stripe)
            </button>
          )}
        </section>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) return { redirect: { destination: '/auth/signin', permanent: false } };

  const { prisma } = await import('../../lib/prisma');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { subscription: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  const sub = member?.workspace?.subscription;

  return {
    props: {
      plan: sub?.plan || 'FREE',
      status: sub?.status || 'ACTIVE',
      trialEndsAt: sub?.trialEndsAt?.toISOString() || null,
    },
  };
}
