import { LegalPage } from "@/components/legal/legal-page";
import { FORUM_RULES } from "@/components/forum/rules";

export const metadata = { title: "Richtlinien" };

export default function Page() {
  return (
    <LegalPage title="Inserats- & Community-Richtlinien">
      <h2>Grundsätze</h2>
      <ul>
        <li>Nur volljährige Personen, nur freiwillige Angebote. Jeder Hinweis auf Zwang, Ausbeutung oder Menschenhandel führt zur sofortigen Sperrung und ggf. Meldung an die Behörden.</li>
        <li>Nur eigene Bilder bzw. Bilder mit nachgewiesener Einwilligung der abgebildeten Person. Keine pornografischen Darstellungen.</li>
        <li>Wahrheitsgemäße Angaben. Fake-Profile und Identitätsmissbrauch werden gelöscht.</li>
        <li>Keine Werbung für ungeschützten Geschlechtsverkehr oder mit Schwangeren (§ 32 ProstSchG).</li>
        <li>Keine Preise für sexuelle Handlungen im Detail, keine anstößige Sprache in Titeln und Slogans.</li>
      </ul>
      <h2>Bilder</h2>
      <ul>
        <li>JPEG, PNG oder WebP, max. 10 MB. Metadaten werden entfernt.</li>
        <li>Jedes Bild wird vor der Veröffentlichung geprüft. Gesperrte Bilder werden per Prüfsumme erkannt und können nicht erneut hochgeladen werden.</li>
      </ul>
      <h2>Forum & Nachrichten</h2>
      <ul>{FORUM_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      <h2>Durchsetzung</h2>
      <p>Verstöße führen je nach Schwere zur Ablehnung, Entfernung, befristeten oder dauerhaften Sperrung. Entscheidungen werden begründet. Du kannst über <a href="mailto:[beschwerde@domain.de]">[beschwerde@domain.de]</a> widersprechen.</p>
    </LegalPage>
  );
}
