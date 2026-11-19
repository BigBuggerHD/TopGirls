import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "AGB" };

export default function Page() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen">
      <h2>§ 1 Geltungsbereich und Leistungen</h2>
      <p>Top Girls stellt eine technische Plattform für Anzeigen, Werbeflächen, einen internen Marktplatz sowie Kommunikationsfunktionen bereit. Top Girls bietet selbst keine persönlichen Dienstleistungen an, vermittelt keine solchen und ist nicht Vertragspartei von Vereinbarungen zwischen Inserenten und Interessenten.</p>
      <h2>§ 2 Registrierung</h2>
      <p>Die Nutzung ist nur volljährigen Personen gestattet. Inserenten müssen vor der Veröffentlichung eine Identitäts- und Altersprüfung durchlaufen. Mehrfachkonten zur Umgehung von Sperren sind untersagt.</p>
      <h2>§ 3 Pflichten der Inserenten</h2>
      <ul>
        <li>Alle dargestellten Personen sind volljährig und haben der Veröffentlichung freiwillig zugestimmt.</li>
        <li>Inserentinnen in Deutschland verfügen über eine gültige Anmeldebescheinigung nach § 5 ProstSchG, sofern erforderlich; Betreiber über die erforderliche Erlaubnis (§ 12 ProstSchG).</li>
        <li>Keine Werbung entgegen § 32 ProstSchG (insbesondere keine Werbung für Geschlechtsverkehr ohne Kondom und keine Werbung mit Schwangeren).</li>
        <li>Keine pornografischen Darstellungen, keine Inhalte, die gegen den JMStV oder das StGB verstoßen.</li>
        <li>Inhaber aller Rechte an hochgeladenen Bildern und Texten.</li>
      </ul>
      <h2>§ 4 Token</h2>
      <p>Token sind ein internes Guthaben zur Bezahlung von Premium-Funktionen und Werbung. Token sind nicht in Geld umtauschbar und nicht übertragbar. Preise verstehen sich inkl. gesetzlicher Umsatzsteuer. [Verfallsregelung festlegen und prüfen.]</p>
      <h2>§ 5 Widerrufsrecht</h2>
      <p>Verbrauchern steht ein Widerrufsrecht zu. Bei digitalen Inhalten erlischt es, wenn der Verbraucher ausdrücklich zugestimmt hat, dass vor Ablauf der Widerrufsfrist mit der Ausführung begonnen wird, und seine Kenntnis vom Erlöschen bestätigt hat (§ 356 Abs. 5 BGB). [Muster-Widerrufsbelehrung ergänzen.]</p>
      <h2>§ 6 Moderation, Sperrung, Beschwerden</h2>
      <p>Top Girls prüft Inhalte vor der Veröffentlichung und bei Meldungen. Inhalte können entfernt und Konten gesperrt werden. Betroffene erhalten eine Begründung (Art. 17 DSA) und können über das interne Beschwerdemanagement widersprechen (Art. 20 DSA).</p>
      <h2>§ 7 Haftung</h2>
      <p>[Haftungsregelung juristisch ausarbeiten.]</p>
      <h2>§ 8 Schlussbestimmungen</h2>
      <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. [Gerichtsstand prüfen.]</p>
    </LegalPage>
  );
}
