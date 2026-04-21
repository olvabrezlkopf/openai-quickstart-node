export function getDemoState() {
  const now = new Date();
  const day = (offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const ts = (offset, h = 10, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const P = 'demo-plan-001';
  const PH1 = 'demo-phase-001';
  const PH2 = 'demo-phase-002';
  const PH3 = 'demo-phase-003';

  const I1 = 'demo-item-001';
  const I2 = 'demo-item-002';
  const I3 = 'demo-item-003';
  const I4 = 'demo-item-004';
  const I5 = 'demo-item-005';
  const I6 = 'demo-item-006';
  const I7 = 'demo-item-007';
  const I8 = 'demo-item-008';
  const I9 = 'demo-item-009';

  const S1 = 'demo-sched-001';
  const S2 = 'demo-sched-002';
  const S3 = 'demo-sched-003';
  const S4 = 'demo-sched-004';
  const S5 = 'demo-sched-005';
  const S6 = 'demo-sched-006';
  const S7 = 'demo-sched-007';
  const S8 = 'demo-sched-008';
  const S9 = 'demo-sched-009';

  const L1 = 'demo-log-001';
  const L2 = 'demo-log-002';
  const L3 = 'demo-log-003';
  const L4 = 'demo-log-004';
  const L5 = 'demo-log-005';
  const L6 = 'demo-log-006';
  const L7 = 'demo-log-007';

  const J1 = 'demo-journal-001';
  const J2 = 'demo-journal-002';
  const J3 = 'demo-journal-003';
  const J4 = 'demo-journal-004';

  return {
    plans: {
      [P]: {
        id: P,
        name: 'Soziale Situationen meistern',
        goal: 'Schritt für Schritt sicherer werden in Gesprächen und Begegnungen mit anderen Menschen.',
        category: 'Soziale Situationen',
        created_at: ts(-25),
      },
    },

    phases: {
      [PH1]: { id: PH1, planId: P, name: 'Phase 1 — Aufwärmen', order: 0 },
      [PH2]: { id: PH2, planId: P, name: 'Phase 2 — Komfortzone erweitern', order: 1 },
      [PH3]: { id: PH3, planId: P, name: 'Phase 3 — Intensiv-Training', order: 2 },
    },

    items: {
      [I1]: {
        id: I1, planId: P, phaseId: PH1, title: '5 Min Smalltalk mit Barista',
        description: 'Beim Kaffee bestellen ein kurzes Gespräch anfangen — Wetter, Tagesempfehlung, whatever.',
        suds_estimate: 3, difficulty: 1, category: 'Soziale Situationen',
        week: 1, unit: 1, ort: 'Lieblingscafé', dauer: '5 Min', begleitung: 'Allein',
        fokus_beiMir: 'Augenkontakt halten, lächeln', fokus_freude: 'Den Kaffee danach genießen',
        anspruch: 'Keiner. Da sein reicht.', atemuebung: true, notiz: '',
      },
      [I2]: {
        id: I2, planId: P, phaseId: PH1, title: 'Nachbar im Treppenhaus grüßen',
        description: 'Beim nächsten Treffen im Treppenhaus aktiv grüßen und 2-3 Sätze wechseln.',
        suds_estimate: 2, difficulty: 1, category: 'Soziale Situationen',
        week: 1, unit: 2, ort: 'Treppenhaus', dauer: '2 Min', begleitung: 'Allein',
        fokus_beiMir: 'Freundlich bleiben', fokus_freude: '', anspruch: '', atemuebung: false, notiz: '',
      },
      [I3]: {
        id: I3, planId: P, phaseId: PH2, title: 'Allein ins Café — 30 Min sitzen',
        description: 'Alleine hinsetzen, Buch oder Handy mitnehmen, aber bewusst die Umgebung wahrnehmen.',
        suds_estimate: 5, difficulty: 2, category: 'Soziale Situationen',
        week: 2, unit: 1, ort: 'Neues Café in der Altstadt', dauer: '30 Min', begleitung: 'Allein',
        fokus_beiMir: 'Körper spüren, Atmung', fokus_freude: 'Kuchen bestellen',
        anspruch: 'Einfach 30 Min bleiben.', atemuebung: true, notiz: '',
      },
      [I4]: {
        id: I4, planId: P, phaseId: PH2, title: 'Fremde Person nach dem Weg fragen',
        description: 'Auf der Straße jemanden ansprechen und nach einem bestimmten Ort fragen.',
        suds_estimate: 5, difficulty: 2, category: 'Soziale Situationen',
        week: 2, unit: 2, ort: 'Innenstadt', dauer: '5 Min', begleitung: 'Allein',
        fokus_beiMir: 'Stimme ruhig halten', fokus_freude: '', anspruch: '', atemuebung: false, notiz: '',
      },
      [I5]: {
        id: I5, planId: P, phaseId: PH2, title: 'Telefonat — Arzttermin vereinbaren',
        description: 'Aktiv anrufen statt online buchen. Kurz und sachlich.',
        suds_estimate: 6, difficulty: 3, category: 'Soziale Situationen',
        week: 2, unit: 3, ort: 'Zuhause', dauer: '10 Min', begleitung: 'Allein',
        fokus_beiMir: 'Vorher Stichwörter aufschreiben', fokus_freude: 'Danach Belohnung',
        anspruch: 'Es darf unperfekt sein.', atemuebung: true, notiz: 'Nummer vorher raussuchen',
      },
      [I6]: {
        id: I6, planId: P, phaseId: PH3, title: 'Spontan Fremde/n ansprechen',
        description: 'Auf einer Parkbank oder im Café jemanden ansprechen — Kompliment, Frage, whatever.',
        suds_estimate: 7, difficulty: 3, category: 'Soziale Situationen',
        week: 3, unit: 1, ort: 'Park oder Café', dauer: '10 Min', begleitung: 'Allein',
        fokus_beiMir: 'Neugier statt Perfektion', fokus_freude: 'Die Überraschung im Gesicht des anderen',
        anspruch: '', atemuebung: true, notiz: '',
      },
      [I7]: {
        id: I7, planId: P, phaseId: PH3, title: 'Allein zu einem Gruppenevent',
        description: 'Meetup, Lauftreff, Spieleabend — alleine hingehen und mindestens 1 Gespräch führen.',
        suds_estimate: 7, difficulty: 4, category: 'Neue Orte & Räume',
        week: 3, unit: 2, ort: 'Lokaler Meetup', dauer: '90 Min', begleitung: 'Allein',
        fokus_beiMir: 'Ich bin hier, das reicht', fokus_freude: 'Neue Menschen kennenlernen',
        anspruch: '1 Gespräch, mehr muss nicht.', atemuebung: true, notiz: '',
      },
      [I8]: {
        id: I8, planId: P, phaseId: PH3, title: 'Kurze Präsentation vor 3+ Leuten',
        description: 'Im Freundeskreis oder Verein kurz etwas vorstellen — 5 Min reichen.',
        suds_estimate: 8, difficulty: 4, category: 'Soziale Situationen',
        week: 4, unit: 1, ort: 'Freundeskreis / Verein', dauer: '15 Min', begleitung: 'Gruppe',
        fokus_beiMir: 'Langsam sprechen, Pausen machen', fokus_freude: '',
        anspruch: 'Inhalt darf einfach sein.', atemuebung: true, notiz: '',
      },
      [I9]: {
        id: I9, planId: P, phaseId: PH3, title: 'Networking-Event — 3 Gespräche',
        description: 'Branchentreff oder offenes Event besuchen. Ziel: 3 echte Gespräche führen.',
        suds_estimate: 9, difficulty: 5, category: 'Neue Orte & Räume',
        week: 4, unit: 2, ort: 'Networking-Event', dauer: '120 Min', begleitung: 'Allein',
        fokus_beiMir: 'Fragen stellen statt performen', fokus_freude: 'Interessante Geschichten hören',
        anspruch: '3 Gespräche, Länge egal.', atemuebung: true, notiz: '',
      },
    },

    scheduled: {
      [S1]: { id: S1, itemId: I1, date: day(-20), time: '09:00', status: 'completed', notes: '' },
      [S2]: { id: S2, itemId: I2, date: day(-17), time: '18:00', status: 'completed', notes: '' },
      [S3]: { id: S3, itemId: I3, date: day(-13), time: '14:00', status: 'completed', notes: '' },
      [S4]: { id: S4, itemId: I4, date: day(-10), time: '11:00', status: 'completed', notes: '' },
      [S5]: { id: S5, itemId: I5, date: day(-7), time: '10:00', status: 'completed', notes: '' },
      [S6]: { id: S6, itemId: I6, date: day(-3), time: '15:00', status: 'completed', notes: '' },
      [S7]: { id: S7, itemId: I7, date: day(-1), time: '19:00', status: 'completed', notes: '' },
      [S8]: { id: S8, itemId: I8, date: day(2), time: '18:00', status: 'planned', notes: '' },
      [S9]: { id: S9, itemId: I9, date: day(8), time: '17:00', status: 'planned', notes: '' },
    },

    logs: {
      [L1]: { id: L1, schedId: S1, suds_before: 7, suds_after: 5, duration_min: 8, completed: true, rating: 3, started_at: ts(-20, 9), note: 'Bin etwas nervös gewesen.' },
      [L2]: { id: L2, schedId: S2, suds_before: 5, suds_after: 3, duration_min: 4, completed: true, rating: 4, started_at: ts(-17, 18), note: '' },
      [L3]: { id: L3, schedId: S3, suds_before: 7, suds_after: 4, duration_min: 35, completed: true, rating: 4, started_at: ts(-13, 14), note: 'War anfangs unangenehm, wurde dann besser.' },
      [L4]: { id: L4, schedId: S4, suds_before: 6, suds_after: 3, duration_min: 6, completed: true, rating: 4, started_at: ts(-10, 11), note: '' },
      [L5]: { id: L5, schedId: S5, suds_before: 8, suds_after: 4, duration_min: 12, completed: true, rating: 3, started_at: ts(-7, 10), note: 'Herz hat geklopft, aber es war ok.' },
      [L6]: { id: L6, schedId: S6, suds_before: 7, suds_after: 3, duration_min: 14, completed: true, rating: 5, started_at: ts(-3, 15), note: 'Hat richtig Spaß gemacht!' },
      [L7]: { id: L7, schedId: S7, suds_before: 8, suds_after: 4, duration_min: 95, completed: true, rating: 4, started_at: ts(-1, 19), note: 'Bin tatsächlich geblieben.' },
    },

    journals: {
      [J1]: {
        id: J1, logId: L1, schedId: S1, itemId: I1, mode: 'exposure', mood: 3,
        created_at: ts(-20, 9, 30),
        content: {
          was_gelernt: 'Dass der erste Satz das Schlimmste ist — danach wird es leichter.',
          bei_mir_geblieben: 'Ich habe gelächelt und es kam echt rüber.',
          anspruch: 'Hatte den Anspruch, witzig zu sein. War unnötig.',
          gut_angefuehlt: 'Dass die Barista zurückgelächelt hat.',
          ziel_naechste: '',
        },
        tags: [],
      },
      [J2]: {
        id: J2, logId: L3, schedId: S3, itemId: I3, mode: 'exposure', mood: 3,
        created_at: ts(-13, 14, 45),
        content: {
          was_gelernt: 'Ich kann alleine irgendwo sitzen und das ist völlig normal.',
          bei_mir_geblieben: 'Ab Minute 15 habe ich vergessen, dass ich nervös war.',
          anspruch: 'Wollte die ganzen 30 Min bleiben. Habe es geschafft!',
          gut_angefuehlt: 'Der Kuchen war unfassbar gut.',
          ziel_naechste: '',
        },
        tags: [],
      },
      [J3]: {
        id: J3, logId: L5, schedId: S5, itemId: I5, mode: 'exposure', mood: 2,
        created_at: ts(-7, 10, 20),
        content: {
          was_gelernt: 'Telefonieren ist weniger schlimm als die Vorstellung davon.',
          bei_mir_geblieben: 'Meine Stimme hat nicht gezittert, obwohl es sich innen so anfühlte.',
          anspruch: 'Wollte perfekt klingen. War nicht nötig.',
          gut_angefuehlt: 'Dass ich jetzt einen Termin habe — erledigt!',
          ziel_naechste: 'Nächste Woche jemand Fremdes im Park ansprechen',
        },
        tags: [],
      },
      [J4]: {
        id: J4, logId: L7, schedId: S7, itemId: I7, mode: 'exposure', mood: 4,
        created_at: ts(-1, 21),
        content: {
          was_gelernt: 'Andere Menschen sind meistens freundlich, wenn man den ersten Schritt macht.',
          bei_mir_geblieben: 'Ein Typ hat mich gefragt ob ich nächste Woche auch komme. Das hat mich gefreut.',
          anspruch: 'Nur 1 Gespräch — am Ende waren es 3.',
          gut_angefuehlt: 'Dass ich alleine hingegangen bin und mich trotzdem wohlgefühlt habe.',
          ziel_naechste: 'Vor kleiner Gruppe etwas präsentieren',
        },
        tags: [],
      },
    },
  };
}

export const DEMO_PLAN_ID = 'demo-plan-001';
