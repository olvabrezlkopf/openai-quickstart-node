import Head from 'next/head';

export default function Datenschutz() {
  return (
    <>
      <Head><title>Datenschutzerklärung — Mutig</title></Head>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: 'var(--space-xl) var(--space-lg)', lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-xl)' }}>
          Datenschutzerklärung
        </h1>

        <h2>1. Verantwortlicher</h2>
        <p>[Name, Adresse, E-Mail des Betreibers einfügen]</p>

        <h2>2. Erhobene Daten</h2>
        <p>
          Wir erheben und verarbeiten folgende personenbezogene Daten: Name, E-Mail-Adresse,
          Profilbild (optional), sowie von dir erstellte Coaching-Inhalte (Pläne, Kalendereinträge,
          Tagebucheinträge, Fortschrittsdaten).
        </p>

        <h2>3. Zweck der Verarbeitung</h2>
        <p>
          Die Daten werden ausschließlich zur Bereitstellung und Verbesserung unseres
          Live-Coaching-Dienstes verwendet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
          (Vertragserfüllung).
        </p>

        <h2>4. Datenweitergabe</h2>
        <p>
          Wir geben personenbezogene Daten nur an Dritte weiter, soweit dies zur Vertragserfüllung
          erforderlich ist: Zahlungsabwicklung (Stripe), E-Mail-Versand (Resend),
          Hosting (Vercel/Neon). Mit allen Auftragsverarbeitern bestehen AVV.
        </p>

        <h2>5. Deine Rechte (Art. 15–21 DSGVO)</h2>
        <ul>
          <li>Auskunft über deine gespeicherten Daten (Art. 15)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16)</li>
          <li>Löschung deiner Daten (Art. 17) — unter Einstellungen → Konto</li>
          <li>Datenübertragbarkeit (Art. 20) — JSON-Export unter Einstellungen → Konto</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
        </ul>

        <h2>6. Cookies</h2>
        <p>
          Wir verwenden ausschließlich technisch notwendige Cookies für die Authentifizierung
          (Session-Cookie). Analytische oder Marketing-Cookies werden nur nach ausdrücklicher
          Einwilligung gesetzt.
        </p>

        <h2>7. Kontakt</h2>
        <p>[E-Mail-Adresse des Datenschutzbeauftragten einfügen]</p>

        <p style={{ marginTop: 'var(--space-xl)', color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
          Stand: April 2026. Diese Datenschutzerklärung wird bei Bedarf aktualisiert.
        </p>
      </div>
    </>
  );
}

Datenschutz.noShell = true;
