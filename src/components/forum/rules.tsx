import { acceptForumRulesAction } from "@/actions/forum";
import { Button } from "@/components/ui/button";

export const FORUM_RULES = [
  "Keine Veröffentlichung privater Daten – weder eigene noch die Dritter (Klarnamen, Adressen, Telefonnummern, Kennzeichen, Fotos).",
  "Keine unbelegten Anschuldigungen gegen identifizierbare Personen. Warnungen nur allgemein und ohne Identifizierung – konkrete Vorfälle bitte über die Meldefunktion oder an die Polizei.",
  "Respektvoller Umgang, keine Beleidigungen, keine Diskriminierung.",
  "Keine Werbung für illegale Angebote, keine Vermittlung, keine Inhalte mit Bezug zu Minderjährigen.",
  "Beiträge mit möglichen Verstößen werden automatisch zurückgehalten und von der Moderation geprüft.",
];

export function ForumRules({ accepted }: { accepted: boolean }) {
  return (
    <section className="rounded-xl border border-gold/30 bg-gold/5 p-5">
      <p className="mb-3 font-display text-xl text-white">Forenregeln</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/85">{FORUM_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      {!accepted ? <form action={acceptForumRulesAction} className="mt-4"><Button size="sm">Regeln akzeptieren</Button></form> : null}
    </section>
  );
}
