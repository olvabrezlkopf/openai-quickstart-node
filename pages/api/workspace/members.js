import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });

  const { workspaceId, memberId, role } = req.body;
  if (!workspaceId) return res.status(400).json({ message: 'workspaceId erforderlich.' });

  const caller = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!caller || caller.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Nur Admins können Mitglieder verwalten.' });
  }

  if (req.method === 'PATCH') {
    if (!memberId || !role) return res.status(400).json({ message: 'memberId und role erforderlich.' });

    const target = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
    if (!target || target.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Mitglied nicht gefunden.' });
    }
    if (target.userId === session.user.id) {
      return res.status(400).json({ message: 'Du kannst deine eigene Rolle nicht ändern.' });
    }

    await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: role === 'ADMIN' ? 'ADMIN' : 'VIEWER' },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId,
        action: 'member.role_changed',
        resourceType: 'member',
        resourceId: memberId,
        metadata: { newRole: role },
      },
    });

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!memberId) return res.status(400).json({ message: 'memberId erforderlich.' });

    const target = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
    if (!target || target.workspaceId !== workspaceId) {
      return res.status(404).json({ message: 'Mitglied nicht gefunden.' });
    }
    if (target.userId === session.user.id) {
      return res.status(400).json({ message: 'Du kannst dich nicht selbst entfernen.' });
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId,
        action: 'member.removed',
        resourceType: 'member',
        resourceId: memberId,
      },
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
