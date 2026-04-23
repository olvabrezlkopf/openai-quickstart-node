import { getSessionAndWorkspace } from '../../../lib/auth-helpers';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  const { session, workspace, isViewer } = await getSessionAndWorkspace(req, res);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });
  if (!workspace) return res.status(404).json({ message: 'Kein Workspace gefunden.' });

  if (req.method === 'GET') {
    const plans = await prisma.coachingPlan.findMany({
      where: { workspaceId: workspace.id },
      include: {
        phases: { orderBy: { order: 'asc' } },
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
    });

    // Transform to the flat map format the frontend expects
    const state = {
      plans: {},
      phases: {},
      items: {},
      scheduled: {},
      logs: {},
      journals: {},
    };

    for (const plan of plans) {
      state.plans[plan.id] = {
        id: plan.id,
        name: plan.name,
        goal: plan.goal,
        category: plan.category,
        created_at: plan.createdAt.toISOString(),
      };

      for (const phase of plan.phases) {
        state.phases[phase.id] = {
          id: phase.id,
          planId: plan.id,
          name: phase.name,
          order: phase.order,
        };
      }

      for (const item of plan.items) {
        state.items[item.id] = {
          id: item.id,
          planId: plan.id,
          phaseId: item.phaseId,
          title: item.title,
          description: item.description,
          suds_estimate: item.sudsEstimate,
          difficulty: item.difficulty,
          category: item.category,
          week: item.week,
          unit: item.unit,
          ort: item.ort,
          dauer: item.dauer,
          begleitung: item.begleitung,
          fokus_beiMir: item.fokusBeiMir,
          fokus_freude: item.fokusFreude,
          anspruch: item.anspruch,
          atemuebung: item.atemuebung,
          notiz: item.notiz,
        };

        for (const sched of item.scheduled) {
          state.scheduled[sched.id] = {
            id: sched.id,
            itemId: item.id,
            date: sched.date,
            time: sched.time,
            status: sched.status.toLowerCase(),
            notes: sched.notes,
          };

          if (sched.log) {
            const log = sched.log;
            state.logs[log.id] = {
              id: log.id,
              schedId: sched.id,
              suds_before: log.sudsBefore,
              suds_after: log.sudsAfter,
              duration_min: log.durationMin,
              completed: log.completed,
              rating: log.rating,
              started_at: log.startedAt?.toISOString(),
              note: log.note,
            };

            if (log.journal) {
              const j = log.journal;
              state.journals[j.id] = {
                id: j.id,
                logId: log.id,
                schedId: sched.id,
                itemId: item.id,
                mode: j.mode,
                mood: j.mood,
                content: j.content,
                tags: j.tags,
                created_at: j.createdAt.toISOString(),
              };
            }
          }
        }
      }
    }

    return res.status(200).json(state);
  }

  return res.status(405).end();
}
