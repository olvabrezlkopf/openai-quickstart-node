import { prisma } from '../../../lib/prisma';
import { randomBytes } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'E-Mail erforderlich.' });

  // Always return 200 to prevent user enumeration
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) return res.status(200).json({ ok: true });

  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  // In production: send email via Resend
  // import { sendPasswordResetEmail } from '../../../lib/email';
  // await sendPasswordResetEmail(email, token);
  console.log(`[DEV] Password reset token for ${email}: ${token}`);

  return res.status(200).json({ ok: true });
}
