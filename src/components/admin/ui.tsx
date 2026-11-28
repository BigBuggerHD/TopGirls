import { Alert } from "@/components/ui/alert";

const ERRORS: Record<string, string> = {
  "nicht-gefunden": "Eintrag nicht gefunden.",
  "konto-nicht-verifiziert": "Das Konto der Inhaberin ist noch nicht verifiziert. Freigabe nicht möglich.",
  "echtheit-fehlt": "Die Echtheit ist noch nicht bestätigt. Bitte zuerst im Bereich „Echtheit“ bestätigen.",
  "nachweis-fehlt": "Für dieses Agenturprofil liegt kein geprüfter Alters- und Einwilligungsnachweis vor.",
  "kein-bild-freigegeben": "Bitte gib zuerst mindestens ein Bild frei.",
  "begruendung-fehlt": "Bitte gib eine Begründung an (Art. 17 DSA).",
  minderjaehrig: "Laut Geburtsjahr ist die Person minderjährig – Freigabe nicht möglich.",
  ungueltig: "Ungültige Eingaben.",
  "eigenes-konto": "Diese Aktion ist für dein eigenes Konto nicht erlaubt.",
  guthaben: "Das Guthaben reicht für diese Belastung nicht aus.",
  "slug-vergeben": "Der Slug ist bereits vergeben.",
  "schluessel-vergeben": "Der Schlüssel ist bereits vergeben oder ungültig.",
  "wert-vergeben": "Dieser Wert existiert bereits.",
  name: "Bitte gib einen Namen an.",
  label: "Bitte gib eine Bezeichnung an.",
};

export function AdminFlash({ sp }: { sp: { ok?: string; fehler?: string } }) {
  if (sp.fehler) return <Alert variant="error" className="mb-6">{ERRORS[sp.fehler] ?? "Aktion fehlgeschlagen."}</Alert>;
  if (sp.ok) return <Alert variant="success" className="mb-6">Gespeichert.</Alert>;
  return null;
}

export function HiddenBack({ path }: { path: string }) {
  return <input type="hidden" name="back" value={path} />;
}

export const inputCls = "h-9 rounded-md border border-border bg-background-alt px-2.5 text-sm text-foreground focus:border-gold/70 focus:outline-none";
