import { getSessionAndWorkspace } from '../../../lib/auth-helpers';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { session, workspace, isViewer } = await getSessionAndWorkspace(req, res);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });
  if (!workspace) return res.status(404).json({ message: 'Kein Workspace.' });
  if (isViewer) return res.status(403).json({ message: 'Viewer können keine Daten ändern.' });

  const { action, payload } = req.body;
  if (!action || !payload) return res.status(400).json({ message: 'action und payload erforderlich.' });

  try {
    let result;

    switch (action) {
      case 'ADD_PLAN':
        result = await prisma.coachingPlan.create({
          data: {
            id: payload.id,
            workspaceId: workspace.id,
            name: payload.name,
            goal: payload.goal ?? null,
            category: payload.category ?? null,
          },
        });
        break;

      case 'UPDATE_PLAN':
        result = await prisma.coachingPlan.update({
          where: { id: payload.id },
          data: {
            name: payload.name,
            goal: payload.goal ?? undefined,
            category: payload.category ?? undefined,
          },
        });
        break;

      case 'DELETE_PLAN':
        await prisma.coachingPlan.delete({ where: { id: payload.id } });
        result = { deleted: true };
        break;

      case 'ADD_PHASE':
        result = await prisma.phase.create({
          data: {
            id: payload.id,
            planId: payload.planId,
            name: payload.name,
            order: payload.order ?? 0,
          },
        });
        break;

      case 'ADD_ITEM':
        result = await prisma.exposureItem.create({
          data: {
            id: payload.id,
            planId: payload.planId,
            phaseId: payload.phaseId ?? null,
            title: payload.title,
            description: payload.description ?? null,
            sudsEstimate: payload.suds_estimate ?? null,
            difficulty: payload.difficulty ?? null,
            category: payload.category ?? null,
            week: payload.week ?? null,
            unit: payload.unit ?? null,
            ort: payload.ort ?? null,
            dauer: payload.dauer ?? null,
            begleitung: payload.begleitung ?? null,
            fokusBeiMir: payload.fokus_beiMir ?? null,
            fokusFreude: payload.fokus_freude ?? null,
            anspruch: payload.anspruch ?? null,
            atemuebung: payload.atemuebung ?? false,
            notiz: payload.notiz ?? null,
          },
        });
        break;

      case 'UPDATE_ITEM':
        result = await prisma.exposureItem.update({
          where: { id: payload.id },
          data: {
            title: payload.title ?? undefined,
            description: payload.description ?? undefined,
            phaseId: payload.phaseId ?? undefined,
            sudsEstimate: payload.suds_estimate ?? undefined,
            difficulty: payload.difficulty ?? undefined,
            category: payload.category ?? undefined,
            week: payload.week ?? undefined,
            unit: payload.unit ?? undefined,
            ort: payload.ort ?? undefined,
            dauer: payload.dauer ?? undefined,
            begleitung: payload.begleitung ?? undefined,
            fokusBeiMir: payload.fokus_beiMir ?? undefined,
            fokusFreude: payload.fokus_freude ?? undefined,
            anspruch: payload.anspruch ?? undefined,
            atemuebung: payload.atemuebung ?? undefined,
            notiz: payload.notiz ?? undefined,
          },
        });
        break;

      case 'DELETE_ITEM':
        await prisma.exposureItem.delete({ where: { id: payload.id } });
        result = { deleted: true };
        break;

      case 'SCHEDULE_EXPOSURE':
        result = await prisma.scheduled.create({
          data: {
            id: payload.id,
            itemId: payload.itemId,
            date: payload.date,
            time: payload.time,
            status: 'PLANNED',
            notes: payload.notes ?? null,
          },
        });
        break;

      case 'UPDATE_SCHEDULE':
        result = await prisma.scheduled.update({
          where: { id: payload.id },
          data: {
            date: payload.date ?? undefined,
            time: payload.time ?? undefined,
            status: payload.status?.toUpperCase() ?? undefined,
            notes: payload.notes ?? undefined,
          },
        });
        break;

      case 'DELETE_SCHEDULE':
        await prisma.scheduled.delete({ where: { id: payload.id } });
        result = { deleted: true };
        break;

      case 'ADD_LOG':
        result = await prisma.log.create({
          data: {
            id: payload.id,
            schedId: payload.schedId,
            sudsBefore: payload.suds_before ?? null,
            sudsAfter: payload.suds_after ?? null,
            durationMin: payload.duration_min ?? null,
            completed: payload.completed ?? false,
            rating: payload.rating ?? null,
            startedAt: payload.started_at ? new Date(payload.started_at) : null,
            note: payload.note ?? null,
          },
        });
        break;

      case 'UPDATE_LOG':
        result = await prisma.log.update({
          where: { id: payload.id },
          data: {
            sudsBefore: payload.suds_before ?? undefined,
            sudsAfter: payload.suds_after ?? undefined,
            durationMin: payload.duration_min ?? undefined,
            completed: payload.completed ?? undefined,
            rating: payload.rating ?? undefined,
            note: payload.note ?? undefined,
          },
        });
        break;

      case 'ADD_JOURNAL':
        result = await prisma.journal.create({
          data: {
            id: payload.id,
            logId: payload.logId ?? null,
            schedId: payload.schedId ?? null,
            itemId: payload.itemId ?? null,
            mode: payload.mode ?? 'exposure',
            mood: payload.mood ?? null,
            content: payload.content ?? null,
            tags: payload.tags ?? [],
          },
        });
        break;

      default:
        return res.status(400).json({ message: `Unbekannte Aktion: ${action}` });
    }

    return res.status(200).json({ ok: true, result });
  } catch (e) {
    console.error(`Mutation error [${action}]:`, e.message);
    return res.status(500).json({ message: 'Datenbankfehler.' });
  }
}
