import Head from 'next/head';

export default function AGB() {
  return (
    <>
      <Head><title>AGB — Mutig</title></Head>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: 'var(--space-xl) var(--space-lg)', lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-xl)' }}>
          Allgemeine Geschäftsbedingungen
        </h1>

        <h2>1. Geltungsbereich</h2>
        <p>
          Diese AGB gelten für die Nutzung des Live-Coaching-Dienstes „Mutig", betrieben von
          [Betreiber einfügen]. Mutig ist kein medizinisches oder psychotherapeutisches Produkt.
        </p>

        <h2>2. Leistungsbeschreibung</h2>
        <p>
          Mutig stellt eine Plattform zur Planung, Durchführung und Dokumentation von
          persönlichen Herausforderungen bereit. Die Inhalte dienen der Selbstentwicklung
          und ersetzen keine professionelle Beratung.
        </p>

        <h2>3. Registrierung</h2>
        <p>
          Für die Nutzung ist ein Nutzerkonto erforderlich. Du bist für die Richtigkeit
          deiner Angaben und die Sicherheit deines Passworts verantwortlich.
        </p>

        <h2>4. Preise und Zahlung</h2>
        <p>
          Die aktuellen Preise sind auf der Plattform einsehbar. Bezahlung erfolgt über
          Stripe (Kreditkarte, SEPA). Preise verstehen sich inkl. MwSt.
        </p>

        <h2>5. Kündigung</h2>
        <p>
          Du kannst dein Abonnement jederzeit zum Ende der Abrechnungsperiode kündigen.
          Der Zugang bleibt bis zum Periodenende bestehen.
        </p>

        <h2>6. Haftung</h2>
        <p>
          Mutig ist kein Ersatz für professionelle medizinische oder psychologische Behandlung.
          Die Nutzung erfolgt auf eigene Verantwortung.
        </p>

        <h2>7. Anwendbares Recht</h2>
        <p>Es gilt deutsches Recht. Gerichtsstand ist [Ort einfügen].</p>

        <p style={{ marginTop: 'var(--space-xl)', color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
          Stand: April 2026.
        </p>
      </div>
    </>
  );
}

AGB.noShell = true;
