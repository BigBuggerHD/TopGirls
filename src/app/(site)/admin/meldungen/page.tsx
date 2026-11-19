import Link from "next/link";
import type { Report } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { REPORT_REASON, REPORT_STATUS } from "@/lib/labels";
import { handleReportAction } from "@/actions/admin";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { AdminFlash, HiddenBack } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/** Lädt eine Vorschau des gemeldeten Inhalts. Private Nachrichten sind NUR bei Meldung einsehbar – und nur die gemeldete Nachricht. */
async function targetPreview(r: Report): Promise<{ title: string; body?: string; link?: string }> {
  switch (r.targetType) {
    case "PROFILE": {
      const p = await db.profile.findUnique({ where: { id: r.targetId }, select: { stageName: true, status: true, id: true } });
      return p ? { title: `Sedcard „${p.stageName}“ (${p.status})`, link: `/admin/sedcards/${p.id}` } : { title: "Sedcard nicht mehr vorhanden" };
    }
    case "IMAGE": {
      const i = await db.profileImage.findUnique({ where: { id: r.targetId }, select: { profileId: true } });
      return i ? { title: "Bild einer Sedcard", link: `/admin/sedcards/${i.profileId}` } : { title: "Bild nicht mehr vorhanden" };
    }
    case "LISTING": {
      const l = await db.marketplaceListing.findUnique({ where: { id: r.targetId } });
      return l ? { title: `Inserat „${l.title}“ (${l.status})`, body: l.description, link: `/marktplatz/${l.id}` } : { title: "Inserat nicht mehr vorhanden" };
    }
    case "POST": {
      const p = await db.forumPost.findUnique({ where: { id: r.targetId }, include: { author: { select: { email: true } } } });
      return p ? { title: `Forenbeitrag von ${p.author.email} (${p.status})`, body: p.body, link: `/forum/thema/${p.threadId}` } : { title: "Beitrag nicht mehr vorhanden" };
    }
    case "THREAD": {
      const t = await db.forumThread.findUnique({ where: { id: r.targetId } });
      return t ? { title: `Forenthema „${t.title}“`, link: `/forum/thema/${t.id}` } : { title: "Thema nicht mehr vorhanden" };
    }
    case "MESSAGE": {
      const m = await db.message.findUnique({ where: { id: r.targetId }, include: { sender: { select: { email: true } } } });
      return m ? { title: `Private Nachricht von ${m.sender.email}${m.hidden ? " (ausgeblendet)" : ""}`, body: m.body } : { title: "Nachricht nicht mehr vorhanden" };
    }
    case "AD": {
      const a = await db.adBooking.findUnique({ where: { id: r.targetId } });
      return a ? { title: `Werbebuchung „${a.title}“ (${a.status})` } : { title: "Werbebuchung nicht vorhanden" };
    }
    default: {
      const u = await db.user.findUnique({ where: { id: r.targetId }, select: { email: true, id: true } });
      return u ? { title: `Benutzer ${u.email}`, link: `/admin/benutzer/${u.id}` } : { title: `Allgemeine Meldung (${r.targetId})` };
    }
  }
}

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string; id?: string; ok?: string; fehler?: string }> }) {
  await requirePermission("moderation.reports", "/admin");
  const sp = await searchParams;
  const open = sp.status !== "erledigt";
  const reports = await db.report.findMany({
    where: { status: open ? { in: ["OPEN", "IN_REVIEW"] } : { in: ["RESOLVED", "DISMISSED"] } },
    include: { reporter: { select: { email: true } }, handler: { select: { displayName: true } } },
    orderBy: open ? [{ priority: "desc" }, { createdAt: "asc" }] : [{ resolvedAt: "desc" }],
    take: 100,
  });
  const selected = reports.find((r) => r.id === sp.id) ?? reports[0];
  const preview = selected ? await targetPreview(selected) : null;
  const self = `/admin/meldungen?status=${open ? "offen" : "erledigt"}`;

  return (
    <div>
      <PageHeader title="Meldungen" description="Melde- und Abhilfeverfahren (DSA). Meldungen zu Minderjährigkeit und Zwang haben höchste Priorität." />
      <AdminFlash sp={sp} />
      <div className="mb-4 flex gap-1">
        <Link href="?status=offen" className={cn("rounded-full px-3 py-1.5 text-xs", open ? "bg-gold/15 text-gold" : "text-muted")}>Offen</Link>
        <Link href="?status=erledigt" className={cn("rounded-full px-3 py-1.5 text-xs", !open ? "bg-gold/15 text-gold" : "text-muted")}>Erledigt</Link>
      </div>
      {reports.length === 0 ? <EmptyState title="Keine Meldungen" /> : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-surface">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`${self}&id=${r.id}`} className={cn("block px-4 py-3 text-sm hover:bg-surface-2", selected?.id === r.id && "bg-gold/5")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">{REPORT_REASON[r.reason]}</span>
                    <Badge variant={r.priority >= 80 ? "danger" : r.priority >= 50 ? "warning" : "default"}>{r.priority}</Badge>
                  </div>
                  <p className="text-xs text-subtle">{r.targetType} · {formatDateTime(r.createdAt)} · {REPORT_STATUS[r.status]}</p>
                </Link>
              </li>
            ))}
          </ul>
          {selected && preview ? (
            <section className="rounded-xl border border-border bg-surface p-5 text-sm">
              <h2 className="font-display text-2xl text-white">{REPORT_REASON[selected.reason]}</h2>
              <p className="mt-1 text-xs text-subtle">Gemeldet von {selected.reporter?.email ?? selected.reporterEmail ?? "anonym"} am {formatDateTime(selected.createdAt)}</p>
              <p className="mt-4 whitespace-pre-line rounded-lg bg-background-alt p-3">{selected.details}</p>
              <div className="mt-4 rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wider text-subtle">Gemeldeter Inhalt</p>
                <p className="mt-1 font-medium">{preview.link ? <Link href={preview.link} className="text-gold hover:underline" target="_blank">{preview.title}</Link> : preview.title}</p>
                {preview.body ? <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-line text-foreground/80">{preview.body}</p> : null}
              </div>
              {selected.resolution ? <p className="mt-4 text-xs text-muted">Bisherige Entscheidung ({selected.handler?.displayName}): {selected.resolution}</p> : null}
              <form action={handleReportAction} className="mt-5 space-y-3">
                <HiddenBack path={self} />
                <input type="hidden" name="reportId" value={selected.id} />
                <label className="block text-xs text-subtle">Maßnahme am Inhalt
                  <Select name="contentAction" defaultValue="none" className="mt-1">
                    <option value="none">Keine Maßnahme</option>
                    <option value="hide">Ausblenden / pausieren</option>
                    <option value="remove">Entfernen / sperren (bei Bildern inkl. Hash-Sperre)</option>
                    {selected.targetType === "PROFILE" ? <option value="block_profile">Sedcard sperren</option> : null}
                    <option value="suspend_user">Inhalt entfernen bleibt separat – Verfasser 30 Tage sperren</option>
                  </Select>
                </label>
                <Textarea name="resolution" rows={3} placeholder="Begründung / Ergebnis (wird dokumentiert)" defaultValue={selected.resolution ?? ""} />
                <div className="flex flex-wrap gap-2">
                  <Button name="status" value="RESOLVED" size="sm">Erledigt</Button>
                  <Button name="status" value="IN_REVIEW" size="sm" variant="secondary">In Bearbeitung</Button>
                  <Button name="status" value="DISMISSED" size="sm" variant="ghost">Abweisen</Button>
                </div>
              </form>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
