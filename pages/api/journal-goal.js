import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { goalText, planName, category, existingItems } = req.body;
  if (!goalText) return res.status(400).json({ error: 'goalText required' });

  const itemList = (existingItems || [])
    .slice(0, 5)
    .map((i) => `- "${i.title}" (Anspannung: ${i.suds_estimate}, Schwierigkeit: ${i.difficulty})`)
    .join('\n');

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: `Du bist ein Mut-Coach-Assistent. Der Nutzer hat nach einer Übung ein Wochenziel formuliert. Erstelle daraus EINEN konkreten Übungsschritt.

WICHTIG:
- Bleib EXAKT bei dem, was der Nutzer geschrieben hat — erfinde NICHTS dazu
- Erfinde KEINE zusätzlichen Details, Orte oder Szenarien
- Passe Anspannung und Schwierigkeit konsistent zu den bestehenden Übungen an
- Formuliere den Titel als kurze, klare Aktion
- Verwende NIEMALS klinische oder therapeutische Sprache

Antworte NUR mit einem JSON-Objekt:
{"title": "...", "description": "...", "suds_estimate": 0-10, "difficulty": 1-5}`,
      messages: [{
        role: 'user',
        content: `Plan: "${planName || 'Mein Plan'}" (${category || 'Andere'})\n\nBestehende Übungen:\n${itemList || '(noch keine)'}\n\nNeues Wochenziel des Nutzers:\n"${goalText}"`,
      }],
    });

    const text = msg.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const parsed = JSON.parse(match[0]);
    res.status(200).json({
      title: parsed.title || goalText.slice(0, 80),
      description: parsed.description || '',
      suds_estimate: Math.min(10, Math.max(0, Number(parsed.suds_estimate) || 5)),
      difficulty: Math.min(5, Math.max(1, Number(parsed.difficulty) || 3)),
    });
  } catch {
    res.status(200).json({
      title: goalText.slice(0, 80),
      description: goalText,
      suds_estimate: 5,
      difficulty: 3,
    });
  }
}
