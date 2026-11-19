import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/rbac";
import { ReplyForm } from "@/components/forum/forms";
import { ReportDialog } from "@/components/report/report-dialog";
import { Alert } from "@/components/ui/alert";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("forum.use", "/forum");
  const { id } = await params;
  const t = await db.forumThread.findFirst({
    where: { id, status: "VISIBLE" },
    include: {
      category: true,
      posts: { where: { OR: [{ status: "VISIBLE" }, { authorId: user.id, status: "PENDING_REVIEW" }] }, orderBy: { createdAt: "asc" }, include: { author: { select: { displayName: true, companyName: true, role: true } } } },
    },
  });
  if (!t) notFound();
  return (
    <div>
      <Link href={`/forum/${t.category.slug}`} className="text-xs text-subtle hover:text-gold">← {t.category.name}</Link>
      <h1 className="mb-6 mt-2 font-display text-3xl text-white">{t.title}</h1>
      <div className="space-y-4">
        {t.posts.map((p) => (
          <article key={p.id} className="rounded-xl border border-border bg-surface p-5">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span><strong className="text-sm text-white">{p.author.companyName ?? p.author.displayName}</strong> <span className="text-gold">{ROLE_LABELS[p.author.role]}</span></span>
              <span className="flex items-center gap-3 text-subtle"><time>{formatDateTime(p.createdAt)}</time><ReportDialog targetType="POST" targetId={p.id} loggedIn /></span>
            </header>
            {p.status === "PENDING_REVIEW" ? <Alert variant="warning" className="mb-3">Nur für dich sichtbar – wird geprüft ({p.flagReason}).</Alert> : null}
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{p.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-border bg-surface p-5">
        {t.locked ? <p className="text-sm text-muted">Dieses Thema ist geschlossen.</p> : user.forumRulesAcceptedAt ? <ReplyForm threadId={t.id} /> : <p className="text-sm text-muted">Bitte akzeptiere die Forenregeln, um zu antworten.</p>}
      </div>
    </div>
  );
}
