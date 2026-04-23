import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });

  const { workspaceId, email, role } = req.body;
  if (!workspaceId || !email) {
    return res.status(400).json({ message: 'workspaceId und E-Mail erforderlich.' });
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!member || member.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Nur Admins können einladen.' });
  }

  const existing = await prisma.invite.findFirst({
    where: { workspaceId, email: email.toLowerCase(), acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (existing) {
    return res.status(409).json({ message: 'Es gibt bereits eine offene Einladung für diese E-Mail.' });
  }

  const existingMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      user: { email: email.toLowerCase() },
    },
  });
  if (existingMember) {
    return res.status(409).json({ message: 'Diese Person ist bereits Mitglied.' });
  }

  const invite = await prisma.invite.create({
    data: {
      workspaceId,
      email: email.toLowerCase(),
      role: role === 'ADMIN' ? 'ADMIN' : 'VIEWER',
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      workspaceId,
      action: 'member.invited',
      resourceType: 'invite',
      resourceId: invite.id,
      metadata: { email: email.toLowerCase(), role },
    },
  });

  // TODO: send invite email via Resend
  console.log(`[DEV] Invite link: /auth/signup?invite=${invite.token}`);

  return res.status(201).json({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    },
  });
}
