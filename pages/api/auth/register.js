import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, password, invite } = req.body;

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ message: 'E-Mail und Passwort (min. 8 Zeichen) erforderlich.' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Diese E-Mail-Adresse ist bereits registriert.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      passwordHash,
      tosAcceptedAt: new Date(),
    },
  });

  // Auto-create workspace (also done in NextAuth createUser event for OAuth)
  const workspace = await prisma.workspace.create({
    data: {
      name: `${user.name}'s Workspace`,
      members: {
        create: { userId: user.id, role: 'ADMIN' },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      action: 'user.registered',
      resourceType: 'user',
      resourceId: user.id,
    },
  });

  // Accept pending invite if token provided
  if (invite) {
    const inviteRecord = await prisma.invite.findUnique({ where: { token: invite } });
    if (inviteRecord && !inviteRecord.acceptedAt && inviteRecord.expiresAt > new Date()) {
      await prisma.$transaction([
        prisma.workspaceMember.upsert({
          where: { workspaceId_userId: { workspaceId: inviteRecord.workspaceId, userId: user.id } },
          create: { workspaceId: inviteRecord.workspaceId, userId: user.id, role: inviteRecord.role },
          update: { role: inviteRecord.role },
        }),
        prisma.invite.update({
          where: { id: inviteRecord.id },
          data: { acceptedAt: new Date() },
        }),
      ]);
    }
  }

  return res.status(201).json({ ok: true });
}
