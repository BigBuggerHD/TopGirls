import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { markNotificationsReadAction } from "@/actions/messages";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Benachrichtigungen" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <PageHeader title="Benachrichtigungen" actions={items.some((i) => !i.readAt) ? <form action={markNotificationsReadAction}><Button variant="outline" size="sm">Alle als gelesen markieren</Button></form> : null} />
      {items.length === 0 ? <EmptyState title="Keine Benachrichtigungen" /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {items.map((n) => (
            <li key={n.id} className="flex gap-4 p-4">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-border-strong" : "bg-gold"}`} aria-label={n.readAt ? "gelesen" : "ungelesen"} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{n.link ? <Link href={n.link} className="hover:text-gold">{n.title}</Link> : n.title}</p>
                <p className="text-sm text-muted">{n.body}</p>
              </div>
              <time className="shrink-0 text-xs text-subtle">{formatDateTime(n.createdAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
