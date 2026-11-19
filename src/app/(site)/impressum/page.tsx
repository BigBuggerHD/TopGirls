import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Impressum" };

export default function Page() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>[Firmenname, Rechtsform]<br />[Straße Hausnummer]<br />[PLZ Ort]<br />Deutschland</p>
      <p>Vertreten durch: [Geschäftsführer/in]</p>
      <h3>Kontakt</h3>
      <p>E-Mail: [kontakt@domain.de]<br />Telefon: [Telefonnummer]</p>
      <h3>Registereintrag</h3>
      <p>Registergericht: [Amtsgericht]<br />Registernummer: [HRB …]</p>
      <h3>Umsatzsteuer-ID</h3>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: [DE…]</p>
      <h3>Jugendschutzbeauftragte/r</h3>
      <p>[Name, Kontakt] – gemäß § 7 JMStV.</p>
      <h3>Zentrale Kontaktstelle nach Art. 11/12 DSA</h3>
      <p>Behörden und Nutzer erreichen uns unter [dsa@domain.de]. Kommunikationssprachen: Deutsch, Englisch.</p>
      <h3>Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)</h3>
      <p>[Name, Anschrift]</p>
      <h3>Hinweis zum Geschäftsmodell</h3>
      <p>Top Girls ist ein Anzeigen- und Werbeportal. Der Betreiber bietet selbst keine Escort-, Massage- oder sonstigen persönlichen Dienstleistungen an und vermittelt keine solchen Dienstleistungen. Für die Inhalte der Anzeigen sind die jeweiligen Inserenten verantwortlich.</p>
      <h3>Streitbeilegung</h3>
      <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. [Bitte prüfen.]</p>
    </LegalPage>
  );
}
