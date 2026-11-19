import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { PROFILE_STATUS, TX_TYPE, USER_STATUS, VERIFICATION_STATUS } from "@/lib/labels";
import { adjustTokensAction, updateUserAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminFlash, HiddenBack, inputCls } from "@/components/admin/ui";

export default async function AdminUserDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  const admin = await requirePermission("admin.users", "/admin");
  const { id } = await params;
  const sp = await searchParams;
  const u = await db.user.findUnique({
    where: { id },
    include: {
      profiles: { select: { id: true, stageName: true, status: true } },
      transactions: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { reports: true, listings: true, forumPosts: true, sessions: true } },
    },
  });
  if (!u) notFound();
  const reportsAgainst = await db.report.count({ where: { targetType: "USER", targetId: id } });
  const self = `/admin/benutzer/${id}`;
  const op = (name: string, label: string, variant: "default" | "secondary" | "destructive" | "outline" = "secondary", extra?: React.ReactNode) => (
    <form action={updateUserAction} className="flex flex-wrap items-center gap-2">
      <HiddenBack path={self} /><input type="hidden" name="userId" value={id} /><input type="hidden" name="op" value={name} />
      {extra}<Button size="sm" variant={variant}>{label}</Button>
    </form>
  );

  return (
    <div>
      <Link href="/admin/benutzer" className="text-xs text-subtle hover:text-gold">← Benutzer</Link>
      <PageHeader title={u.displayName} description={`${u.email} · ${ROLE_LABELS[u.role]} · registriert am ${formatDate(u.createdAt)}`} />
      <AdminFlash sp={sp} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Konto</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Status: <Badge variant={u.status === "ACTIVE" ? "success" : "danger"}>{USER_STATUS[u.status]}</Badge>{u.suspendedUntil ? ` bis ${formatDateTime(u.suspendedUntil)}` : ""}</p>
            {u.suspensionReason ? <p className="text-xs text-danger">Grund: {u.suspensionReason}</p> : null}
            <p>Firma: {u.companyName ?? "–"}</p>
            <p>E-Mail bestätigt: {u.emailVerifiedAt ? formatDate(u.emailVerifiedAt) : "nein"}</p>
            <p>Identitätsprüfung: {VERIFICATION_STATUS[u.verificationStatus]}</p>
            <p>Letzter Login: {formatDateTime(u.lastLoginAt)} · aktive Sitzungen: {u._count.sessions}</p>
            <p>Inserate: {u._count.listings} · Forenbeiträge: {u._count.forumPosts} · eigene Meldungen: {u._count.reports} · Meldungen gegen Konto: {reportsAgainst}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Aktionen</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {can(admin.role, "admin.roles") ? op("role", "Rolle ändern", "outline",
              <select name="role" defaultValue={u.role} className={inputCls} aria-label="Rolle">{Object.entries(ROLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>) : null}
            {op("suspend", "Befristet sperren", "secondary", <><input name="days" type="number" defaultValue={7} min={1} max={365} className={`${inputCls} w-20`} aria-label="Tage" /><input name="reason" placeholder="Grund" className={inputCls} /></>)}
            {op("ban", "Dauerhaft sperren", "destructive", <input name="reason" placeholder="Grund" className={inputCls} />)}
            {u.status !== "ACTIVE" && u.status !== "DELETED" ? op("unban", "Sperre aufheben", "default") : null}
            <div className="flex flex-wrap gap-2">
              {u.verificationStatus !== "APPROVED" ? op("verify", "Manuell verifizieren", "outline", <input type="hidden" name="value" value="approve" />) : op("verify", "Verifizierung entziehen", "ghost" as never, <input type="hidden" name="value" value="revoke" />)}
              {!u.emailVerifiedAt ? op("verifyEmail", "E-Mail als bestätigt markieren", "outline") : null}
              {op("logout", "Alle Sitzungen beenden", "outline")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Token-Guthaben: {formatNumber(u.tokenBalance)}</CardTitle></CardHeader>
          <CardContent>
            {can(admin.role, "admin.tokens") ? (
              <form action={adjustTokensAction} className="mb-4 flex flex-wrap gap-2">
                <HiddenBack path={self} /><input type="hidden" name="userId" value={id} />
                <input name="amount" type="number" placeholder="+/- Token" className={`${inputCls} w-28`} required aria-label="Token" />
                <input name="reason" placeholder="Begründung (Pflicht)" className={`${inputCls} flex-1`} required aria-label="Begründung" />
                <Button size="sm">Buchen</Button>
              </form>
            ) : null}
            <ul className="space-y-1 text-xs">
              {u.transactions.map((t) => <li key={t.id} className="flex justify-between gap-2"><span>{formatDateTime(t.createdAt)} · {TX_TYPE[t.type]} · {t.description}</span><span className={t.tokens > 0 ? "text-success" : ""}>{t.tokens > 0 ? "+" : ""}{t.tokens}</span></li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sedcards</CardTitle></CardHeader>
          <CardContent>
            {u.profiles.length === 0 ? <p className="text-sm text-muted">Keine.</p> : (
              <ul className="space-y-1 text-sm">{u.profiles.map((p) => <li key={p.id} className="flex justify-between"><Link href={`/admin/sedcards/${p.id}`} className="hover:text-gold">{p.stageName}</Link><Badge>{PROFILE_STATUS[p.status]}</Badge></li>)}</ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
