import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, createdAt: true, tosAcceptedAt: true,
      workspaceMembers: {
        include: {
          workspace: {
            include: {
              plans: {
                include: {
                  phases: true,
                  items: {
                    include: {
                      scheduled: {
                        include: {
                          log: { include: { journal: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return res.status(404).end();

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    workspaces: user.workspaceMembers.map(m => ({
      role: m.role,
      workspace: {
        id: m.workspace.id,
        name: m.workspace.name,
        plans: m.workspace.plans,
      },
    })),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="mutig-export-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.status(200).json(exportData);
}
