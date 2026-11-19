import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { ForumRules } from "@/components/forum/rules";

export default async function ForumHome() {
  const user = await requirePermission("forum.use", "/forum");
  const cats = await db.forumCategory.findMany({
    where: { active: true }, orderBy: { sortOrder: "asc" },
    include: { _count: { select: { threads: { where: { status: "VISIBLE" } } } }, threads: { where: { status: "VISIBLE" }, orderBy: { lastPostAt: "desc" }, take: 1, select: { title: true, lastPostAt: true, id: true } } },
  });
  return (
    <div>
      <PageHeader eyebrow="Geschlossener Bereich" title="Forum" description="Austausch unter Inserentinnen, Agenturen und Betrieben. Nur für verifizierte Geschäftskonten sichtbar." />
      <ForumRules accepted={!!user.forumRulesAcceptedAt} />
      <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {cats.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <MessagesSquare className="mt-1 size-5 shrink-0 text-gold" />
              <div>
                <Link href={`/forum/${c.slug}`} className="font-display text-xl text-white hover:text-gold">{c.name}</Link>
                <p className="text-sm text-muted">{c.description}</p>
              </div>
            </div>
            <div className="text-xs text-subtle sm:text-right">
              <p>{c._count.threads} Themen</p>
              {c.threads[0] ? <p><Link href={`/forum/thema/${c.threads[0].id}`} className="text-muted hover:text-gold">{c.threads[0].title}</Link> · {formatDateTime(c.threads[0].lastPostAt)}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
