import type { Role } from "@prisma/client";
import { Check } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";

const P_LABELS: Record<string, string> = {
  "dashboard.access": "Dashboard", "profile.own": "Eigene Sedcard", "profile.multiple": "Mehrere Sedcards", "promotion.book": "Premium buchen", "ads.book": "Werbung buchen",
  "tokens.buy": "Token kaufen", "stats.view": "Statistiken", "marketplace.post": "Marktplatz-Inserate", "messages.use": "Nachrichten", "forum.use": "Forum", "verification.request": "Verifizierung beantragen",
  "moderation.access": "Moderationsbereich", "moderation.profiles": "Sedcards prüfen", "moderation.images": "Bilder prüfen", "moderation.marketplace": "Marktplatz moderieren", "moderation.forum": "Forum moderieren",
  "moderation.reports": "Meldungen bearbeiten", "moderation.messages": "Gemeldete Nachrichten", "moderation.verifications": "ID-Prüfungen", "moderation.ads": "Werbung prüfen",
  "admin.users": "Benutzer verwalten", "admin.roles": "Rollen vergeben", "admin.categories": "Kategorien", "admin.filters": "Filter", "admin.ads": "Werbeflächen", "admin.products": "Produkte & Preise",
  "admin.tokens": "Token-Buchungen", "admin.payments": "Zahlungen", "admin.settings": "Einstellungen", "admin.audit": "Audit-Protokoll", "admin.stats": "Plattform-Statistik",
};

export default async function RolesPage() {
  await requirePermission("admin.roles", "/admin");
  const counts = await db.user.groupBy({ by: ["role"], _count: true, where: { status: { not: "DELETED" } } });
  const roles = Object.keys(ROLE_LABELS) as Role[];
  return (
    <div>
      <PageHeader title="Rollen & Rechte" description="Übersicht der Berechtigungen je Rolle. Rollen weist du in der Benutzerverwaltung zu." />
      <Alert variant="info" className="mb-6">Die Rechtematrix ist zentral im Code definiert (<code>src/lib/rbac.ts</code>), versioniert und wird bei jeder Server-Aktion geprüft. Dadurch kann sie nicht versehentlich über die Oberfläche ausgehebelt werden.</Alert>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-xs">
          <thead className="bg-surface-2"><tr><th className="px-3 py-2 text-left">Berechtigung</th>{roles.map((r) => <th key={r} className="px-2 py-2 text-center">{ROLE_LABELS[r]}<br /><span className="font-normal text-subtle">{counts.find((c) => c.role === r)?._count ?? 0} Konten</span></th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {PERMISSIONS.map((p) => (
              <tr key={p} className="hover:bg-surface-2/50">
                <td className="px-3 py-2">{P_LABELS[p] ?? p} <span className="text-subtle">({p})</span></td>
                {roles.map((r) => <td key={r} className="text-center">{ROLE_PERMISSIONS[r].includes(p) ? <Check className="mx-auto size-4 text-gold" aria-label="ja" /> : <span className="text-border-strong" aria-label="nein">–</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
