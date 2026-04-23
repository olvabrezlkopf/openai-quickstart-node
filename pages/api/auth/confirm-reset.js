import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token, password } = req.body;
  if (!token || !password || password.length < 8) {
    return res.status(400).json({ message: 'Token und Passwort erforderlich.' });
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    return res.status(400).json({ message: 'Link ungültig oder abgelaufen.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: { passwordHash },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return res.status(200).json({ ok: true });
}
