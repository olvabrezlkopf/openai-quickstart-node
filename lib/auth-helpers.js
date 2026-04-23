import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { prisma } from './prisma';

export async function getSessionAndWorkspace(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return { session: null, member: null, workspace: null };

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { joinedAt: 'asc' },
  });

  return {
    session,
    member,
    workspace: member?.workspace ?? null,
    isAdmin: member?.role === 'ADMIN',
    isViewer: member?.role === 'VIEWER',
  };
}
