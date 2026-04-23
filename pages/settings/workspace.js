import { useState } from 'react';
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { prisma } from '../../lib/prisma';
import styles from './settings.module.css';

export default function WorkspaceSettings({ workspace, members, pendingInvites, currentUserId }) {
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

  const [localMembers, setLocalMembers] = useState(members);
  const [localInvites, setLocalInvites] = useState(pendingInvites);

  async function handleSaveName(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    const res = await fetch('/api/workspace/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: workspace.id, name: name.trim() }),
    });

    setSaving(false);
    if (!res.ok) setError('Fehler beim Speichern.');
    else setSaved(true);
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteMessage('');

    const res = await fetch('/api/workspace/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: workspace.id, email: inviteEmail.toLowerCase(), role: inviteRole }),
    });

    const data = await res.json();
    setInviting(false);

    if (!res.ok) {
      setInviteMessage(data.message || 'Fehler beim Einladen.');
    } else {
      setInviteMessage(`Einladung an ${inviteEmail} gesendet.`);
      setInviteEmail('');
      setLocalInvites(prev => [...prev, data.invite]);
    }
  }

  async function handleRemoveMember(memberId) {
    const res = await fetch('/api/workspace/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: workspace.id, memberId }),
    });
    if (res.ok) setLocalMembers(prev => prev.filter(m => m.id !== memberId));
  }

  async function handleChangeRole(memberId, role) {
    const res = await fetch('/api/workspace/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: workspace.id, memberId, role }),
    });
    if (res.ok) setLocalMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
  }

  return (
    <>
      <Head><title>Workspace — Mutig</title></Head>
      <div className={styles.page}>
        <h1 className={styles.title}>Workspace</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Allgemein</h2>
          <form onSubmit={handleSaveName} className={styles.form}>
            {error && <div className={styles.errorBanner}>{error}</div>}
            {saved && <div className={styles.successBanner}>Gespeichert.</div>}
            <div className={styles.field}>
              <label htmlFor="wsname">Workspace-Name</label>
              <input
                id="wsname"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </form>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mitglieder</h2>
          <ul className={styles.memberList}>
            {localMembers.map(m => (
              <li key={m.id} className={styles.memberRow}>
                <div className={styles.memberAvatar}>
                  {m.user.avatarUrl
                    ? <img src={m.user.avatarUrl} alt="" />
                    : <span>{(m.user.name || m.user.email)[0].toUpperCase()}</span>
                  }
                </div>
                <div className={styles.memberInfo}>
                  <strong>{m.user.name || m.user.email}</strong>
                  <span>{m.user.email}</span>
                </div>
                <div className={styles.memberActions}>
                  {m.userId !== currentUserId ? (
                    <>
                      <select
                        value={m.role}
                        onChange={e => handleChangeRole(m.id, e.target.value)}
                        className={styles.roleSelect}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemoveMember(m.id)}
                      >
                        Entfernen
                      </button>
                    </>
                  ) : (
                    <span className={styles.youBadge}>Du · {m.role}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Einladen</h2>
          <form onSubmit={handleInvite} className={styles.inlineForm}>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="kollegin@beispiel.de"
              required
              className={styles.inlineInput}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className={styles.roleSelect}
            >
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" className={styles.inviteBtn} disabled={inviting}>
              {inviting ? 'Sende…' : 'Einladen'}
            </button>
          </form>
          {inviteMessage && (
            <p className={styles.inviteMessage}>{inviteMessage}</p>
          )}

          {localInvites.length > 0 && (
            <div className={styles.pendingInvites}>
              <p className={styles.pendingTitle}>Ausstehende Einladungen</p>
              {localInvites.map(inv => (
                <div key={inv.id} className={styles.pendingRow}>
                  <span>{inv.email}</span>
                  <span className={styles.roleBadge}>{inv.role}</span>
                  <span className={styles.pendingExpiry}>
                    läuft ab {new Date(inv.expiresAt).toLocaleDateString('de-DE')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) return { redirect: { destination: '/auth/signin', permanent: false } };

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            orderBy: { joinedAt: 'asc' },
          },
          invites: {
            where: { acceptedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  if (!member) return { redirect: { destination: '/', permanent: false } };

  return {
    props: {
      workspace: { id: member.workspace.id, name: member.workspace.name },
      members: member.workspace.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
      pendingInvites: member.workspace.invites.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt.toISOString(),
      })),
      currentUserId: session.user.id,
    },
  };
}
