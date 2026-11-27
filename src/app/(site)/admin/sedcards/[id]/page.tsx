import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { DOC_TYPE, PROFILE_STATUS, REPORT_REASON, VERIFICATION_STATUS } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/rbac";
import { checkProfileText } from "@/lib/content-filter";
import { reviewProfileAction, reviewVerificationAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/input";
import { AdminFlash, HiddenBack, inputCls } from "@/components/admin/ui";
import { ImageReviewCard } from "@/components/admin/image-review";
import { mediaUrl } from "@/lib/media";

export default async function AdminProfileDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  await requirePermission("moderation.profiles", "/admin");
  const { id } = await params;
  const sp = await searchParams;
  const p = await db.profile.findUnique({
    where: { id },
    include: {
      owner: true, category: true, images: { orderBy: { sortOrder: "asc" } },
      attributes: { include: { filter: true, options: { include: { option: true } } } },
      verifications: { where: { docType: "MODEL_CONSENT" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!p) notFound();
  const reports = await db.report.findMany({ where: { targetType: "PROFILE", targetId: id }, orderBy: { createdAt: "desc" } });
  const text = checkProfileText(`${p.stageName} ${p.headline ?? ""} ${p.description}`);
  const ownerProfiles = await db.profile.count({ where: { ownerId: p.ownerId } });
  const self = `/admin/sedcards/${id}`;

  return (
    <div>
      <Link href="/admin/sedcards" className="text-xs text-subtle hover:text-gold">← Sedcard-Verwaltung</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl text-white">{p.stageName}{p.age ? `, ${p.age}` : ""}{p.profileType === "DUO" ? ` & ${p.partnerName ?? "Person 2"}${p.age2 ? `, ${p.age2}` : ""} (Duo)` : ""}</h1>
        <Badge variant={p.status === "PUBLISHED" ? "success" : p.status === "PENDING_REVIEW" ? "warning" : "default"}>{PROFILE_STATUS[p.status]}</Badge>
      </div>
      <AdminFlash sp={sp} />
      {text.flagged ? <Alert variant="error" className="mb-4">Automatischer Inhaltsfilter: {text.reasons.join(", ")}</Alert> : null}
      {reports.length ? <Alert variant="warning" className="mb-4">{reports.length} Meldung(en): {reports.map((r) => REPORT_REASON[r.reason]).join(", ")}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-display text-xl text-white">Inhalt</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-subtle">Kategorie</dt><dd>{p.category.name}</dd></div>
              <div><dt className="text-subtle">Ort</dt><dd>{p.postalCode} {p.city} {p.region}</dd></div>
              <div><dt className="text-subtle">Slogan</dt><dd>{p.headline ?? "–"}</dd></div>
              <div><dt className="text-subtle">Sprachen</dt><dd>{p.languages.join(", ") || "–"}</dd></div>
              <div><dt className="text-subtle">Kontakt</dt><dd>{[p.contactPhone, p.contactWhatsapp, p.contactEmail, p.contactWebsite].filter(Boolean).join(" · ") || "–"}</dd></div>
              <div><dt className="text-subtle">Einwilligungen bestätigt</dt><dd>{formatDateTime(p.consentConfirmedAt)}</dd></div>
            </dl>
            <p className="mt-4 whitespace-pre-line rounded-lg bg-background-alt p-4 text-sm text-foreground/85">{p.description || "–"}</p>
            {p.attributes.length ? <p className="mt-3 text-xs text-muted">{p.attributes.map((a) => `${a.filter.label}${a.person === 2 ? " (Person 2)" : ""}: ${a.numberValue ?? (a.boolValue == null ? a.options.map((o) => o.option.label).join("/") : a.boolValue ? "Ja" : "Nein")}`).join(" · ")}</p> : null}
          </section>
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-display text-xl text-white">Bilder ({p.images.length})</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {p.images.map((img) => <ImageReviewCard key={img.id} img={img} back={self} />)}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5 text-sm">
            <h2 className="mb-3 font-display text-xl text-white">Inhaber</h2>
            <p><Link href={`/admin/benutzer/${p.ownerId}`} className="text-gold hover:underline">{p.owner.email}</Link></p>
            <p className="text-muted">{ROLE_LABELS[p.owner.role]}{p.owner.companyName ? ` · ${p.owner.companyName}` : ""}</p>
            <p className="mt-2">Identitätsprüfung: <strong>{VERIFICATION_STATUS[p.owner.verificationStatus]}</strong></p>
            <p>E-Mail bestätigt: {p.owner.emailVerifiedAt ? formatDate(p.owner.emailVerifiedAt) : "nein"}</p>
            <p>Sedcards des Kontos: {ownerProfiles}</p>
          </section>

          {p.verifications.length ? (
            <section className="rounded-xl border border-border bg-surface p-5 text-sm">
              <h2 className="mb-3 font-display text-xl text-white">Nachweis der Person</h2>
              {p.verifications.map((v) => (
                <div key={v.id} className="mb-3 space-y-2">
                  <p>{DOC_TYPE[v.docType]} · <Badge variant={v.status === "APPROVED" ? "success" : v.status === "REJECTED" ? "danger" : "warning"}>{VERIFICATION_STATUS[v.status]}</Badge></p>
                  {v.documentKey ? <a href={mediaUrl(v.documentKey)!} target="_blank" rel="noreferrer" className="text-gold underline">Dokument öffnen</a> : <p className="text-xs text-subtle">Dokument nach Prüfung gelöscht.</p>}
                  {v.status === "PENDING" ? (
                    <form action={reviewVerificationAction} className="space-y-2">
                      <HiddenBack path={self} />
                      <input type="hidden" name="verificationId" value={v.id} />
                      <input name="note" placeholder="Notiz / Ablehnungsgrund" className={`${inputCls} w-full`} />
                      <div className="flex gap-2"><Button size="sm" name="decision" value="approve">Bestätigen</Button><Button size="sm" variant="destructive" name="decision" value="reject">Ablehnen</Button></div>
                    </form>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          <section className="rounded-xl border border-gold/40 bg-surface p-5">
            <h2 className="mb-3 font-display text-xl text-white">Entscheidung</h2>
            <form action={reviewProfileAction} className="space-y-3">
              <HiddenBack path="/admin/sedcards" />
              <input type="hidden" name="profileId" value={p.id} />
              <Textarea name="reason" rows={3} placeholder="Begründung (Pflicht bei Ablehnung/Sperrung, wird der Inhaberin mitgeteilt)" />
              <div className="grid gap-2">
                <Button name="decision" value="approve">Freigeben & veröffentlichen</Button>
                <Button name="decision" value="reject" variant="secondary">Ablehnen (Überarbeitung möglich)</Button>
                <Button name="decision" value="block" variant="destructive">Sperren</Button>
              </div>
            </form>
            {p.status === "PUBLISHED" ? <Button asChild variant="link" className="mt-3"><Link href={`/profil/${p.slug}`}>Öffentliche Ansicht</Link></Button> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
