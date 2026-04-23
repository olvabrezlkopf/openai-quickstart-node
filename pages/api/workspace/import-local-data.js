import { getSessionAndWorkspace } from '../../../lib/auth-helpers';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { session, workspace, isViewer } = await getSessionAndWorkspace(req, res);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });
  if (!workspace) return res.status(404).json({ message: 'Kein Workspace.' });
  if (isViewer) return res.status(403).json({ message: 'Keine Berechtigung.' });

  const { plans, phases, items, scheduled, logs, journals } = req.body;
  if (!plans) return res.status(400).json({ message: 'Keine Daten zum Importieren.' });

  try {
    await prisma.$transaction(async (tx) => {
      // Plans
      for (const p of Object.values(plans)) {
        await tx.coachingPlan.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            workspaceId: workspace.id,
            name: p.name,
            goal: p.goal ?? null,
            category: p.category ?? null,
          },
          update: {},
        });
      }

      // Phases
      for (const ph of Object.values(phases || {})) {
        await tx.phase.upsert({
          where: { id: ph.id },
          create: {
            id: ph.id,
            planId: ph.planId,
            name: ph.name,
            order: ph.order ?? 0,
          },
          update: {},
        });
      }

      // Items
      for (const i of Object.values(items || {})) {
        await tx.exposureItem.upsert({
          where: { id: i.id },
          create: {
            id: i.id,
            planId: i.planId,
            phaseId: i.phaseId ?? null,
            title: i.title,
            description: i.description ?? null,
            sudsEstimate: i.suds_estimate ?? null,
            difficulty: i.difficulty ?? null,
            category: i.category ?? null,
            week: i.week ?? null,
            unit: i.unit ?? null,
            ort: i.ort ?? null,
            dauer: i.dauer ?? null,
            begleitung: i.begleitung ?? null,
            fokusBeiMir: i.fokus_beiMir ?? null,
            fokusFreude: i.fokus_freude ?? null,
            anspruch: i.anspruch ?? null,
            atemuebung: i.atemuebung ?? false,
            notiz: i.notiz ?? null,
          },
          update: {},
        });
      }

      // Scheduled
      for (const s of Object.values(scheduled || {})) {
        await tx.scheduled.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
            itemId: s.itemId,
            date: s.date,
            time: s.time,
            status: (s.status || 'planned').toUpperCase(),
            notes: s.notes ?? null,
          },
          update: {},
        });
      }

      // Logs
      for (const l of Object.values(logs || {})) {
        await tx.log.upsert({
          where: { id: l.id },
          create: {
            id: l.id,
            schedId: l.schedId,
            sudsBefore: l.suds_before ?? null,
            sudsAfter: l.suds_after ?? null,
            durationMin: l.duration_min ?? null,
            completed: l.completed ?? false,
            rating: l.rating ?? null,
            startedAt: l.started_at ? new Date(l.started_at) : null,
            note: l.note ?? null,
          },
          update: {},
        });
      }

      // Journals
      for (const j of Object.values(journals || {})) {
        await tx.journal.upsert({
          where: { id: j.id },
          create: {
            id: j.id,
            logId: j.logId ?? null,
            schedId: j.schedId ?? null,
            itemId: j.itemId ?? null,
            mode: j.mode ?? 'exposure',
            mood: j.mood ?? null,
            content: j.content ?? null,
            tags: j.tags ?? [],
          },
          update: {},
        });
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId: workspace.id,
        action: 'data.imported_from_local',
        metadata: {
          planCount: Object.keys(plans).length,
          itemCount: Object.keys(items || {}).length,
        },
      },
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Import error:', e);
    return res.status(500).json({ message: 'Import fehlgeschlagen: ' + e.message });
  }
}
