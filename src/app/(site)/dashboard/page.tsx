import Link from "next/link";
import { AlertTriangle, ArrowRight, Coins, Eye, FileText, MousePointerClick, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { getStatsSeries, resolveRange } from "@/lib/stats";
import { formatDateTime, formatNumber } from "@/lib/format";
import { PROFILE_STATUS, VERIFICATION_STATUS } from "@/lib/labels";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationButton } from "@/components/dashboard/resend-verification";

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ willkommen?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [profiles, notifications] = await Promise.all([
    db.profile.findMany({ where: { ownerId: user.id }, select: { id: true, stageName: true, status: true }, orderBy: { updatedAt: "desc" } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const { from, to } = resolveRange("woche");
  const stats = profiles.length ? await getStatsSeries(profiles.map((p) => p.id), from, to) : null;
  const business = can(user.role, "verification.request");

  return (
    <div>
      <PageHeader eyebrow={ROLE_LABELS[user.role]} title={`Hallo, ${user.displayName}`} description="Hier findest du alle wichtigen Informationen zu deinem Konto auf einen Blick." />
      <div className="space-y-3">
        {sp.willkommen ? <Alert variant="success">Willkommen bei Top Girls! Dein Konto wurde erstellt. Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir gesendet haben.</Alert> : null}
        {!user.emailVerifiedAt ? (
          <Alert variant="warning" className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2"><AlertTriangle className="size-4" /> Deine E-Mail-Adresse ist noch nicht bestätigt.</span>
            <ResendVerificationButton />
          </Alert>
        ) : null}
        {business && user.verificationStatus !== "APPROVED" ? (
          <Alert variant="info" className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Identitätsprüfung: {VERIFICATION_STATUS[user.verificationStatus]}. Sie ist Voraussetzung für die Veröffentlichung.</span>
            {user.verificationStatus !== "PENDING" ? <Button asChild size="sm" variant="outline"><Link href="/dashboard/verifizierung">Jetzt verifizieren</Link></Button> : null}
          </Alert>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can(user.role, "profile.own") ? <StatCard label="Sedcards" value={profiles.length} hint={`${profiles.filter((p) => p.status === "PUBLISHED").length} veröffentlicht`} /> : null}
        {can(user.role, "tokens.buy") ? <StatCard label="Token-Guthaben" value={formatNumber(user.tokenBalance)} hint="für Premium & Werbung" /> : null}
        {stats ? (
          <>
            <StatCard label="Profilaufrufe (7 Tage)" value={formatNumber(stats.totals.views)} />
            <StatCard label="Kontaktklicks (7 Tage)" value={formatNumber(stats.totals.clicks)} />
          </>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {can(user.role, "profile.own") ? (
          <section className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl text-white">Deine Sedcards</h2>
              <Link href="/dashboard/sedcards" className="text-xs text-gold hover:underline">Alle verwalten</Link>
            </div>
            {profiles.length === 0 ? (
              <p className="text-sm text-muted">Du hast noch keine Sedcard. <Link href="/dashboard/sedcards" className="text-gold hover:underline">Jetzt erstellen</Link></p>
            ) : (
              <ul className="divide-y divide-border">
                {profiles.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <Link href={`/dashboard/sedcards/${p.id}`} className="flex items-center gap-2 text-sm hover:text-gold"><FileText className="size-4 text-subtle" /> {p.stageName}</Link>
                    <Badge variant={p.status === "PUBLISHED" ? "success" : p.status === "PENDING_REVIEW" ? "warning" : p.status === "REJECTED" ? "danger" : "default"}>{PROFILE_STATUS[p.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-display text-2xl text-white">Entdecken</h2>
            <p className="mt-2 text-sm text-muted">Durchsuche geprüfte Profile und kontaktiere Inserentinnen direkt über das interne Nachrichtensystem.</p>
            <Button asChild className="mt-4"><Link href="/suche">Zur Suche <ArrowRight /></Link></Button>
          </section>
        )}
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-white">Benachrichtigungen</h2>
            <Link href="/dashboard/benachrichtigungen" className="text-xs text-gold hover:underline">Alle anzeigen</Link>
          </div>
          {notifications.length === 0 ? <p className="text-sm text-muted">Keine Benachrichtigungen.</p> : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li key={n.id} className="flex gap-3">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-border-strong" : "bg-gold"}`} />
                  <div>
                    <p className="text-sm text-white">{n.link ? <Link href={n.link} className="hover:text-gold">{n.title}</Link> : n.title}</p>
                    <p className="text-xs text-muted">{n.body}</p>
                    <p className="text-[11px] text-subtle">{formatDateTime(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {can(user.role, "promotion.book") ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <QuickLink href="/dashboard/anzeigen" icon={<Eye className="size-5 text-gold" />} title="Premium buchen" text="Mehr Sichtbarkeit für deine Sedcard." />
          <QuickLink href="/dashboard/werbung" icon={<MousePointerClick className="size-5 text-gold" />} title="Werbefläche buchen" text="Banner auf Startseite & Suche." />
          <QuickLink href="/dashboard/tokens" icon={<Coins className="size-5 text-gold" />} title="Token kaufen" text="Guthaben sicher aufladen." />
        </div>
      ) : null}
    </div>
  );
}

function QuickLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-gold/50">
      {icon}
      <p className="mt-3 font-medium text-white">{title}</p>
      <p className="text-xs text-muted">{text}</p>
    </Link>
  );
}
