import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';
const MAX_QUESTIONS = 10;

const INTERVIEW_SYSTEM = `Du bist ein einfühlsamer Coach, der Menschen hilft, eine persönliche Expositionshierarchie (Angstleiter) für ihre Ängste aufzubauen. Dies ist KEIN Therapieersatz, sondern ein Selbstcoaching-Tool.

Deine Aufgabe: Führe ein kurzes, fokussiertes Interview (maximal ${MAX_QUESTIONS} Fragen) mit dem Nutzer auf DEUTSCH, um zu verstehen:
1. Welche Angst/Situation vermeidet der Nutzer?
2. Wie sieht der aktuelle Alltag aus? Was ist das Ziel?
3. Welche konkreten Situationen lösen Angst aus (von leicht bis schwer)?
4. Welche Ressourcen (Begleitung, Atemübungen, sichere Orte) gibt es?
5. Wie viel Zeit kann pro Woche investiert werden?

WICHTIGE REGELN:
- Stelle IMMER NUR EINE Frage pro Nachricht
- Halte Fragen kurz, warmherzig und konkret
- Antworte ausschließlich mit der nächsten Frage (keine Einleitungen, keine Erklärungen)
- Keine Meta-Kommentare ("Gute Frage", "Verstanden", etc.)
- Nach der letzten Frage stoppst du - der Nutzer wird dann den Plan generieren lassen`;

const GENERATE_SYSTEM = `Du bist ein Experte für graduelle Exposition. Basierend auf dem vorangegangenen Interview erstelle jetzt einen vollständigen, personalisierten Expositionsplan.

WICHTIG: Antworte ausschließlich mit einem einzigen JSON-Objekt, KEIN Fließtext davor oder danach, KEIN Markdown-Codeblock.

JSON-Format:
{
  "plan": {
    "name": "Kurzer, motivierender Name des Plans",
    "goal": "Was der Nutzer konkret erreichen will",
    "category": "Eine von: Soziale Angst, Höhenangst, Agoraphobie, Reiseangst, Spezifische Phobie, Andere"
  },
  "phases": [
    {
      "name": "Phase 1 — Name der Phase",
      "order": 0,
      "items": [
        {
          "title": "Konkrete Situation/Übung",
          "description": "Kurze Erklärung (1 Satz)",
          "suds_estimate": 3,
          "week": 1,
          "unit": 1,
          "ort": "Konkreter Ort",
          "dauer": "z.B. 30 Min",
          "begleitung": "Allein / 1 Person (ruhig) / Gruppe",
          "fokus_beiMir": "Worauf während der Übung achten",
          "fokus_freude": "Was sich erlauben",
          "anspruch": "Welcher Anspruch an die Übung (oft: KEINER. Da sein reicht.)",
          "atemuebung": true,
          "notiz": "Optionale Notiz für den Nutzer"
        }
      ]
    }
  ]
}

Richtlinien:
- 3 bis 6 Phasen, logisch aufsteigend in Schwierigkeit
- Pro Phase 3 bis 6 Items
- suds_estimate: 0 (ganz leicht) bis 10 (maximal angstauslösend), muss konsistent aufsteigend sein
- week startet bei 1 und steigt phasenweise
- unit ist die Einheit innerhalb einer Woche (meist 1-3)
- Konkrete, machbare Situationen — keine abstrakten Übungen
- Deutsche Sprache durchgehend`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY nicht gesetzt. Füge ihn in .env.local hinzu.',
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { mode, messages } = req.body || {};

  if (!mode || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    if (mode === 'interview') {
      // Count user messages to know when to stop
      const userMessageCount = messages.filter((m) => m.role === 'user').length;
      const isLastQuestion = userMessageCount >= MAX_QUESTIONS - 1;

      const systemPrompt = INTERVIEW_SYSTEM + (isLastQuestion
        ? '\n\nDies ist die LETZTE mögliche Frage. Stelle die wichtigste noch offene Frage.'
        : `\n\nBereits gestellte Fragen: ${userMessageCount}. Verbleibend: ${MAX_QUESTIONS - userMessageCount}.`);

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: messages.length === 0
          ? [{ role: 'user', content: 'Lass uns starten. Stelle mir deine erste Frage.' }]
          : messages,
      });

      const text = response.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');

      return res.status(200).json({
        question: text.trim(),
        questionNumber: userMessageCount + 1,
        maxQuestions: MAX_QUESTIONS,
        done: userMessageCount + 1 >= MAX_QUESTIONS,
      });
    }

    if (mode === 'generate') {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: GENERATE_SYSTEM,
        messages: [
          ...messages,
          {
            role: 'user',
            content: 'Erstelle jetzt den vollständigen Expositionsplan im JSON-Format basierend auf meinen Antworten.',
          },
        ],
      });

      const text = response.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');

      // Extract JSON from response
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        return res.status(500).json({ error: 'Konnte kein JSON aus der Antwort extrahieren.' });
      }
      const jsonStr = text.slice(jsonStart, jsonEnd + 1);
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        return res.status(500).json({ error: 'JSON-Parsing fehlgeschlagen: ' + e.message });
      }

      return res.status(200).json({ plan: parsed });
    }

    return res.status(400).json({ error: 'Unknown mode' });
  } catch (err) {
    console.error('AI error:', err);
    return res.status(500).json({
      error: err.message || 'Unbekannter Fehler beim KI-Aufruf.',
    });
  }
}
