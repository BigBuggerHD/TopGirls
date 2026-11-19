import { Alert } from "@/components/ui/alert";

export function LegalPage({ title, children, draft = true, updated = "19.11.2026" }: { title: string; children: React.ReactNode; draft?: boolean; updated?: string }) {
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Top Girls</p>
      <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">{title}</h1>
      <p className="mt-2 text-xs text-subtle">Stand: {updated}</p>
      {draft ? (
        <Alert variant="warning" className="mt-6">
          <strong>Entwurf:</strong> Dieser Text ist ein unverbindlicher Entwurf und muss vor dem Produktivbetrieb juristisch geprüft und mit den tatsächlichen Angaben des Betreibers ergänzt werden. Platzhalter sind in [eckigen Klammern] markiert.
        </Alert>
      ) : null}
      <div className="prose-tg mt-8">{children}</div>
    </div>
  );
}
