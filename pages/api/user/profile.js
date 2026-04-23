import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });

  if (req.method !== 'PATCH') return res.status(405).end();

  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name erforderlich.' });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
  });

  return res.status(200).json({ ok: true, name: user.name });
}
