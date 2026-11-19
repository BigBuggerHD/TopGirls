import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Pin } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { NewThreadForm } from "@/components/forum/forms";

export default async function ForumCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePermission("forum.use", "/forum");
  const { slug } = await params;
  const cat = await db.forumCategory.findFirst({ where: { slug, active: true } });
  if (!cat) notFound();
  const threads = await db.forumThread.findMany({
    where: { categoryId: cat.id, status: "VISIBLE" }, orderBy: [{ pinned: "desc" }, { lastPostAt: "desc" }], take: 100,
    include: { author: { select: { displayName: true, companyName: true } }, _count: { select: { posts: { where: { status: "VISIBLE" } } } } },
  });
  return (
    <div>
      <Link href="/forum" className="text-xs text-subtle hover:text-gold">← Forum</Link>
      <PageHeader title={cat.name} description={cat.description ?? undefined} />
      {threads.length === 0 ? <EmptyState title="Noch keine Themen" /> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {threads.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/forum/thema/${t.id}`} className="flex items-center gap-2 font-medium text-white hover:text-gold">{t.pinned ? <Pin className="size-3.5 text-gold" /> : null}{t.locked ? <Lock className="size-3.5 text-subtle" /> : null}{t.title}</Link>
                <p className="text-xs text-subtle">von {t.author.companyName ?? t.author.displayName} · {formatDateTime(t.createdAt)}</p>
              </div>
              <div className="text-right text-xs text-subtle"><p>{t._count.posts} Beiträge</p><p>{formatDateTime(t.lastPostAt)}</p></div>
            </li>
          ))}
        </ul>
      )}
      {user.forumRulesAcceptedAt ? (
        <section className="mt-8 rounded-xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="mb-4 font-display text-2xl text-white">Neues Thema</h2>
          <NewThreadForm categoryId={cat.id} />
        </section>
      ) : <p className="mt-8 text-sm text-muted">Bitte akzeptiere auf der <Link href="/forum" className="text-gold underline">Forum-Startseite</Link> die Regeln, um Beiträge zu schreiben.</p>}
    </div>
  );
}
