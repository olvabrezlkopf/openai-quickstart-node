import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });

  const { workspaceId, name } = req.body;
  if (!workspaceId || !name?.trim()) {
    return res.status(400).json({ message: 'workspaceId und name erforderlich.' });
  }

  // Verify user is ADMIN of this workspace
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });

  if (!member || member.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Keine Berechtigung.' });
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: name.trim() },
  });

  return res.status(200).json({ workspace });
}
