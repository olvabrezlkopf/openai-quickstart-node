import { formatDateDE } from './dates';

export function exportCsv(state) {
  const rows = [['Datum', 'Übung', 'Kategorie', 'Anspannung vorher', 'Anspannung nachher', 'Reduktion %', 'Dauer (Min)', 'Abgeschlossen']];

  const logs = Object.values(state.logs).sort((a, b) =>
    (a.started_at || '').localeCompare(b.started_at || '')
  );

  for (const log of logs) {
    const sched = log.schedId ? state.scheduled[log.schedId] : null;
    const item = sched ? state.items[sched.itemId] : null;
    const phase = item?.phaseId ? state.phases[item.phaseId] : null;
    const plan = phase ? state.plans[phase.planId] : null;

    rows.push([
      sched?.date || log.started_at?.slice(0, 10) || '',
      item?.title || '',
      item?.category || plan?.category || '',
      log.suds_before ?? '',
      log.suds_after ?? '',
      log.suds_before > 0 ? Math.round((log.suds_after / log.suds_before) * 100) : '',
      log.duration_min ?? '',
      log.completed ? 'Ja' : 'Nein',
    ]);
  }

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  download('﻿' + csv, `mutig-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
}

export function exportPlanPdf(plan, phases, items, scheduled) {
  const sortedPhases = Object.values(phases)
    .filter((p) => p.planId === plan.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const phaseItems = {};
  for (const phase of sortedPhases) {
    phaseItems[phase.id] = Object.values(items)
      .filter((i) => i.phaseId === phase.id)
      .sort((a, b) => (a.week || 0) - (b.week || 0) || (a.unit || 0) - (b.unit || 0));
  }
  const unassigned = Object.values(items)
    .filter((i) => i.planId === plan.id && !i.phaseId)
    .sort((a, b) => (a.week || 0) - (b.week || 0));

  let html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>${esc(plan.name)} — Mutig</title>
<style>
@page{margin:2cm;size:A4}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;line-height:1.6;max-width:700px;margin:0 auto}
.brand{font-size:28px;font-weight:800;color:#4f46e5;letter-spacing:-0.02em;margin-bottom:4px}
.plan-name{font-size:22px;font-weight:700;margin:16px 0 4px}
.plan-meta{color:#6b7280;font-size:14px;margin-bottom:20px}
.goal{background:#f8f7ff;border-left:3px solid #4f46e5;padding:12px 16px;margin-bottom:24px;border-radius:4px;font-size:14px}
.phase-title{font-size:15px;font-weight:700;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #e5e7eb}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
th{text-align:left;padding:8px 10px;background:#f9fafb;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb}
td{padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top}
.suds{font-weight:700;text-align:center}
.stars{color:#f59e0b;letter-spacing:1px}
.desc{color:#6b7280;font-size:12px;margin-top:2px}
.footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="brand">Mutig</div>
<div class="plan-name">${esc(plan.name)}</div>
<div class="plan-meta">${esc(plan.category || '')} · Erstellt am ${formatDateDE(new Date(plan.created_at))}</div>
${plan.goal ? `<div class="goal"><strong>Ziel:</strong> ${esc(plan.goal)}</div>` : ''}`;

  function renderTable(itemList) {
    if (itemList.length === 0) return '<p style="color:#9ca3af;font-size:13px">Keine Schritte</p>';
    let t = `<table><thead><tr><th style="width:50px">W/E</th><th>Übung</th><th style="width:60px">Ansp.</th><th style="width:80px">Schwer.</th><th style="width:75px">Termin</th></tr></thead><tbody>`;
    for (const item of itemList) {
      const sched = Object.values(scheduled).find((s) => s.itemId === item.id);
      t += `<tr>
<td>W${item.week || '?'}/E${item.unit || '?'}</td>
<td><strong>${esc(item.title)}</strong>${item.description ? `<div class="desc">${esc(item.description)}</div>` : ''}</td>
<td class="suds">${item.suds_estimate ?? '-'}</td>
<td class="stars">${'★'.repeat(item.difficulty || 0)}${'☆'.repeat(5 - (item.difficulty || 0))}</td>
<td>${sched?.date ? new Date(sched.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '—'}</td>
</tr>`;
    }
    t += '</tbody></table>';
    return t;
  }

  for (const phase of sortedPhases) {
    html += `<div class="phase-title">${esc(phase.name)}</div>`;
    html += renderTable(phaseItems[phase.id] || []);
  }
  if (unassigned.length > 0) {
    if (sortedPhases.length > 0) html += '<div class="phase-title">Weitere Schritte</div>';
    html += renderTable(unassigned);
  }

  html += `<div class="footer">Erstellt mit Mutig — Dein Mut-Coach · ${formatDateDE(new Date())}</div></body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
