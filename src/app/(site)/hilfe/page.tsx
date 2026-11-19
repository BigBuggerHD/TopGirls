import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Hilfe für Betroffene" };

export default function Page() {
  return (
    <LegalPage title="Hilfe für Betroffene" draft={false}>
      <p>Du wirst zu etwas gezwungen, bedroht oder ausgebeutet? Du bist nicht allein – es gibt kostenlose, vertrauliche Hilfe.</p>
      <h2>Akute Gefahr</h2>
      <p><strong>Polizei: 110</strong> · Notruf (Feuerwehr/Rettungsdienst): 112</p>
      <h2>Beratung & Unterstützung</h2>
      <ul>
        <li><strong>Hilfetelefon „Gewalt gegen Frauen“:</strong> 116 016 – rund um die Uhr, kostenlos, anonym, in vielen Sprachen.</li>
        <li><strong>KOK e. V.</strong> – Bundesweiter Koordinierungskreis gegen Menschenhandel; vermittelt spezialisierte Fachberatungsstellen in deiner Nähe.</li>
        <li><strong>Hilfetelefon Sexueller Missbrauch:</strong> 0800 22 55 530 – kostenlos und anonym.</li>
        <li><strong>Nummer gegen Kummer</strong> (Kinder und Jugendliche): 116 111.</li>
        <li>Gesundheitliche Beratung nach § 10 ProstSchG bei deinem örtlichen Gesundheitsamt – vertraulich und kostenfrei.</li>
      </ul>
      <h2>Hinweise an Top Girls</h2>
      <p>Wenn du Hinweise auf Zwang, Menschenhandel oder Minderjährigkeit im Zusammenhang mit einer Anzeige hast, nutze bitte unsere <a href="/melden">Meldestelle</a>. Wir behandeln deine Meldung vertraulich und arbeiten mit den zuständigen Behörden zusammen.</p>
      <p className="text-xs text-subtle">Bitte prüfe die Telefonnummern vor dem Produktivbetrieb auf Aktualität.</p>
    </LegalPage>
  );
}
