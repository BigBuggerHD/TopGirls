import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Jugendschutz" };

export default function Page() {
  return (
    <LegalPage title="Jugendschutz">
      <p>Top Girls richtet sich ausschließlich an Erwachsene. Wir nehmen den Schutz von Kindern und Jugendlichen sehr ernst.</p>
      <h2>Unsere Maßnahmen</h2>
      <ul>
        <li>Serverseitig abgesicherte Altersabfrage vor dem Zugriff auf jegliche Inhalte – auch bei direkten Links und API-Zugriffen.</li>
        <li>Kennzeichnung mit dem RTA-Label für Jugendschutzprogramme und Filtersoftware.</li>
        <li>Verbot pornografischer Inhalte; manuelle Prüfung aller Bilder und Sedcards vor der Veröffentlichung.</li>
        <li>Verpflichtende Identitäts- und Altersprüfung aller Inserenten; bei Agenturprofilen zusätzlich Altersnachweis und Einwilligung jeder dargestellten Person.</li>
        <li>Automatische Sperre von Begriffen, die auf Minderjährigkeit hindeuten; sofortige Deaktivierung gemeldeter Profile bei Verdacht.</li>
        <li>Benannte/r Jugendschutzbeauftragte/r: [Name, Kontakt].</li>
      </ul>
      <h2>Wichtiger Hinweis</h2>
      <p>Die einfache Altersabfrage ist eine Selbstauskunft und ersetzt keine Altersverifikation im Sinne des § 4 Abs. 2 JMStV. Pornografische oder sonstige nach § 4 Abs. 2 JMStV unzulässige Inhalte sind auf Top Girls daher nicht erlaubt. Sollte das Angebot solche Inhalte umfassen, ist vorab ein von der KJM positiv bewertetes Altersverifikationssystem zu integrieren.</p>
      <h2>Für Eltern</h2>
      <p>Mit Jugendschutzprogrammen (z. B. JusProg) können Eltern den Zugriff auf Angebote wie dieses technisch sperren. Die Website ist entsprechend gekennzeichnet.</p>
      <p>Verdacht auf Minderjährigkeit? Bitte nutze sofort unsere <a href="/melden">Meldestelle</a>. Bei akuter Gefahr: Polizei 110.</p>
    </LegalPage>
  );
}
