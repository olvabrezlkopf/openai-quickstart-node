import Head from 'next/head';

export default function Impressum() {
  return (
    <>
      <Head><title>Impressum — Mutig</title></Head>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: 'var(--space-xl) var(--space-lg)', lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-xl)' }}>
          Impressum
        </h1>

        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          [Vollständiger Name / Firma]<br />
          [Straße und Hausnummer]<br />
          [PLZ Ort]
        </p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: [kontakt@mutig.app]<br />
          Telefon: [optional]
        </p>

        <h2>Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:<br />
          [DE...]
        </p>

        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>[Name und Adresse]</p>

        <h2>Haftungsausschluss</h2>
        <p>
          Mutig ist eine Live-Coaching-Plattform. Die bereitgestellten Inhalte und Werkzeuge
          dienen der persönlichen Weiterentwicklung und stellen kein medizinisches oder
          psychotherapeutisches Angebot dar.
        </p>

        <p style={{ marginTop: 'var(--space-xl)', color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
          Stand: April 2026.
        </p>
      </div>
    </>
  );
}

Impressum.noShell = true;
