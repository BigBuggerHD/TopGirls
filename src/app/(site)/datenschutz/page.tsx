import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Datenschutzerklärung" };

export default function Page() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <h2>1. Verantwortlicher</h2>
      <p>[Firmenname, Anschrift, E-Mail]. Datenschutzbeauftragte/r: [Name, Kontakt].</p>
      <h2>2. Grundsätze</h2>
      <p>Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung der Plattform erforderlich ist, eine Einwilligung vorliegt oder eine gesetzliche Pflicht besteht (Art. 6 Abs. 1 lit. a, b, c, f DSGVO). Angaben, aus denen sich das Sexualleben ergeben kann, sind besondere Kategorien nach Art. 9 DSGVO; ihre Veröffentlichung in Sedcards erfolgt ausschließlich auf Grundlage der ausdrücklichen Einwilligung der Inserentin (Art. 9 Abs. 2 lit. a DSGVO), die jederzeit widerrufen werden kann.</p>
      <h2>3. Welche Daten wir verarbeiten</h2>
      <ul>
        <li><strong>Altersabfrage:</strong> Ein technisch notwendiges, signiertes Cookie speichert deine Antwort für die konfigurierte Dauer (§ 25 Abs. 2 Nr. 2 TDDDG). Es enthält keine personenbezogenen Daten.</li>
        <li><strong>Konto:</strong> E-Mail-Adresse, Anzeigename, ggf. Firmenname, Passwort (nur als Argon2id-Hash), Rolle.</li>
        <li><strong>Sitzung:</strong> ein Sitzungs-Cookie; serverseitig gespeichert werden nur ein Hash des Tokens, ein gekürzter Hash der IP-Adresse und der Browser-Typ.</li>
        <li><strong>Länderfilter:</strong> Inserentinnen können ihre Sedcard für bestimmte Länder ausblenden. Dazu wird beim Aufruf aus der IP-Adresse lokal das Land ermittelt; die IP-Adresse wird dafür nicht gespeichert und nicht an Dritte übermittelt. Länderdatenbank: <a href="https://db-ip.com" className="text-gold underline" rel="noopener noreferrer">IP Geolocation by DB-IP</a> (Lizenz CC BY 4.0).</li>
        <li><strong>Echtheitsprüfung:</strong> Das Echtheits-Video wird verschlüsselt übertragen, in einem privaten Speicherbereich abgelegt, nur von berechtigtem Personal eingesehen und nach Abschluss der Prüfung gelöscht. Gespeichert werden der Zeitpunkt des Eingangs und – nur bei Freigabe im Browser – die nächstgelegene größere Stadt (keine Koordinaten), die ebenfalls nach der Prüfung gelöscht wird. Als Nachweis bleibt ein internes Standbild (Echtheitsfoto), das nicht veröffentlicht wird.</li>
        <li><strong>Nachweise bei Agenturprofilen:</strong> Einwilligungs- und Altersnachweise werden privat gespeichert, nur von berechtigtem Personal eingesehen und nach Abschluss der Prüfung gelöscht.</li>
        <li><strong>Sedcards und Bilder:</strong> die von dir eingegebenen Inhalte. Bild-Metadaten (EXIF, GPS) werden beim Upload entfernt.</li>
        <li><strong>Nachrichten:</strong> Inhalte privater Nachrichten werden nicht automatisiert ausgewertet. Die Moderation sieht eine Nachricht nur, wenn sie gemeldet wurde.</li>
        <li><strong>Statistiken:</strong> ausschließlich aggregierte Tageszähler (Impressionen, Aufrufe, Klicks) ohne Personenbezug.</li>
        <li><strong>Zahlungen:</strong> Paket, Betrag, Status und Referenz. Zahlungsdaten (z. B. Kartennummern) verarbeiten ausschließlich die Zahlungsdienstleister.</li>
      </ul>
      <h2>4. Empfänger</h2>
      <p>Hosting-Anbieter [Name, Sitz], Objektspeicher [Name, Sitz], E-Mail-Versand [Name], Zahlungsdienstleister (z. B. PayPal (Europe) S.à r.l. et Cie, S.C.A.). Mit Auftragsverarbeitern bestehen Verträge nach Art. 28 DSGVO.</p>
      <h2>5. Speicherdauer</h2>
      <p>Kontodaten bis zur Löschung des Kontos. Buchungsbelege 10 Jahre (§ 147 AO, § 257 HGB) in anonymisierter Form. Audit-Protokolle [Frist festlegen]. Abgelaufene Sitzungen und Tokens werden automatisch gelöscht.</p>
      <h2>6. Deine Rechte</h2>
      <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Widerruf von Einwilligungen (Art. 15–21 DSGVO). Datenexport und Kontolöschung kannst du direkt in den Kontoeinstellungen auslösen. Du hast das Recht auf Beschwerde bei einer Aufsichtsbehörde.</p>
      <h2>7. Cookies</h2>
      <p>Wir verwenden ausschließlich technisch notwendige Cookies (Altersbestätigung, Sitzung). Es werden keine Tracking- oder Werbe-Cookies eingesetzt.</p>
    </LegalPage>
  );
}
