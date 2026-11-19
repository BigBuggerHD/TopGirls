import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

export const metadata = { title: "Nachrichten" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ archiv?: string }> }) {
  const user = await requirePermission("messages.use");
  const archived = (await searchParams).archiv === "1";
  const parts = await db.conversationParticipant.findMany({
    where: { userId: user.id, archived },
    include: {
      conversation: {
        include: {
          participants: { include: { user: { select: { id: true, displayName: true, companyName: true } } } },
          messages: { where: { hidden: false }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });
  return (
    <div>
      <PageHeader title="Nachrichten" description="Private Unterhaltungen innerhalb von Top Girls. Moderatoren sehen Nachrichten nur, wenn sie gemeldet wurden."
        actions={<Link href={archived ? "/dashboard/nachrichten" : "?archiv=1"} className="text-sm text-gold hover:underline">{archived ? "Zum Posteingang" : "Archiv"}</Link>} />
      {parts.length === 0 ? <EmptyState title={archived ? "Archiv ist leer" : "Noch keine Nachrichten"} text="Du kannst Inserenten direkt über ihre Sedcard anschreiben." /> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {parts.map(({ conversation: c, lastReadAt }) => {
            const other = c.participants.find((p) => p.userId !== user.id)?.user;
            const last = c.messages[0];
            const unread = last && last.senderId !== user.id && (!lastReadAt || last.createdAt > lastReadAt);
            return (
              <li key={c.id}>
                <Link href={`/dashboard/nachrichten/${c.id}`} className="flex gap-4 p-4 hover:bg-surface-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-lg text-gold">{(other?.displayName ?? "?").slice(0, 1)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate", unread ? "font-semibold text-white" : "text-foreground")}>{other?.companyName ?? other?.displayName ?? "Unbekannt"}</p>
                      <time className="shrink-0 text-xs text-subtle">{last ? formatDateTime(last.createdAt) : ""}</time>
                    </div>
                    <p className="truncate text-xs text-gold/80">{c.subject}</p>
                    <p className={cn("truncate text-sm", unread ? "text-foreground" : "text-muted")}>{last?.body}</p>
                  </div>
                  {unread ? <span className="mt-2 size-2 shrink-0 rounded-full bg-gold" aria-label="ungelesen" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
