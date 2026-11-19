import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { CONTENT_STATUS } from "@/lib/labels";
import { moderatePostAction, moderateThreadAction } from "@/actions/admin";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminFlash, HiddenBack } from "@/components/admin/ui";

export default async function AdminForum({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  await requirePermission("moderation.forum", "/admin");
  const sp = await searchParams;
  const [pending, threads] = await Promise.all([
    db.forumPost.findMany({ where: { status: "PENDING_REVIEW" }, include: { author: { select: { email: true } }, thread: { select: { title: true, id: true } } }, orderBy: { createdAt: "asc" } }),
    db.forumThread.findMany({ include: { category: true, author: { select: { email: true } }, _count: { select: { posts: true } } }, orderBy: { lastPostAt: "desc" }, take: 50 }),
  ]);
  return (
    <div>
      <PageHeader title="Forum-Moderation" description="Vom Inhaltsfilter zurückgehaltene Beiträge (mögliche private Daten oder unbelegte Anschuldigungen) sowie alle Themen." />
      <AdminFlash sp={sp} />
      <h2 className="mb-3 font-display text-2xl text-white">Zurückgehaltene Beiträge</h2>
      {pending.length === 0 ? <EmptyState title="Keine Beiträge in Prüfung" /> : (
        <div className="mb-10 space-y-4">
          {pending.map((p) => (
            <div key={p.id} className="rounded-xl border border-warning/30 bg-surface p-5 text-sm">
              <p className="text-xs text-subtle">{p.author.email} · <Link href={`/forum/thema/${p.thread.id}`} className="text-gold hover:underline">{p.thread.title}</Link> · {formatDateTime(p.createdAt)}</p>
              <p className="mt-1 text-xs text-warning">Filter: {p.flagReason}</p>
              <p className="mt-3 whitespace-pre-line rounded-lg bg-background-alt p-3">{p.body}</p>
              <form action={moderatePostAction} className="mt-3 flex gap-2">
                <HiddenBack path="/admin/forum" />
                <input type="hidden" name="postId" value={p.id} />
                <Button size="sm" name="decision" value="approve">Freigeben</Button>
                <Button size="sm" variant="secondary" name="decision" value="hide">Ausblenden</Button>
                <Button size="sm" variant="destructive" name="decision" value="remove">Entfernen</Button>
              </form>
            </div>
          ))}
        </div>
      )}
      <h2 className="mb-3 mt-10 font-display text-2xl text-white">Themen</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
        {threads.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <Link href={`/forum/thema/${t.id}`} className="font-medium text-white hover:text-gold">{t.title}</Link>
              <p className="text-xs text-subtle">{t.category.name} · {t.author.email} · {t._count.posts} Beiträge</p>
            </div>
            <form action={moderateThreadAction} className="flex flex-wrap items-center gap-2">
              <HiddenBack path="/admin/forum" />
              <input type="hidden" name="threadId" value={t.id} />
              <Badge variant={t.status === "VISIBLE" ? "success" : "danger"}>{CONTENT_STATUS[t.status]}</Badge>
              <Button size="sm" variant="ghost" name="op" value="pin">{t.pinned ? "Lösen" : "Anheften"}</Button>
              <Button size="sm" variant="ghost" name="op" value="lock">{t.locked ? "Öffnen" : "Schließen"}</Button>
              {t.status === "VISIBLE" ? <Button size="sm" variant="ghost" className="text-danger" name="op" value="remove">Entfernen</Button> : <Button size="sm" variant="ghost" name="op" value="restore">Wiederherstellen</Button>}
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
