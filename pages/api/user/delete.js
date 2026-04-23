import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });

  const userId = session.user.id;

  // Soft-delete: mark as deleted, anonymize PII
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      name: '[gelöscht]',
      avatarUrl: null,
      passwordHash: null,
    },
  });

  // Invalidate sessions
  await prisma.session.deleteMany({ where: { userId } });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'user.deleted',
      resourceType: 'user',
      resourceId: userId,
    },
  });

  return res.status(200).json({ ok: true });
}
