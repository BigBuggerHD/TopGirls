import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { archiveConversationAction, toggleBlockConversationAction } from "@/actions/messages";
import { MessageForm } from "@/components/messages/message-form";
import { ReportDialog } from "@/components/report/report-dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Unterhaltung" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("messages.use");
  const { id } = await params;
  const conv = await db.conversation.findFirst({
    where: { id, participants: { some: { userId: user.id } } },
    include: {
      participants: { include: { user: { select: { id: true, displayName: true, companyName: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 500 },
    },
  });
  if (!conv) notFound();
  await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId: id, userId: user.id } }, data: { lastReadAt: new Date() } });
  const me = conv.participants.find((p) => p.userId === user.id)!;
  const other = conv.participants.find((p) => p.userId !== user.id);
  const blocked = conv.participants.some((p) => p.blocked);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard/nachrichten" className="text-xs text-subtle hover:text-gold">← Alle Nachrichten</Link>
          <h1 className="mt-2 font-display text-3xl text-white">{other?.user.companyName ?? other?.user.displayName}</h1>
          <p className="text-sm text-gold/80">{conv.subject}</p>
        </div>
        <div className="flex gap-2">
          <form action={toggleBlockConversationAction}><input type="hidden" name="conversationId" value={id} /><Button size="sm" variant="secondary">{me.blocked ? "Blockierung aufheben" : "Blockieren"}</Button></form>
          <form action={archiveConversationAction}><input type="hidden" name="conversationId" value={id} /><Button size="sm" variant="ghost">Archivieren</Button></form>
        </div>
      </div>
      {blocked ? <Alert variant="warning" className="mb-4">Diese Unterhaltung ist blockiert. Es können keine Nachrichten gesendet werden.</Alert> : null}
      <div className="mb-6 space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-6">
        {conv.messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", mine ? "rounded-br-sm bg-gold/15 text-foreground" : "rounded-bl-sm bg-surface-3 text-foreground")}>
                {m.hidden ? <em className="text-subtle">Diese Nachricht wurde von der Moderation ausgeblendet.</em> : <p className="whitespace-pre-line">{m.body}</p>}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-subtle">
                <time>{formatDateTime(m.createdAt)}</time>
                {!mine && !m.hidden ? <ReportDialog targetType="MESSAGE" targetId={m.id} loggedIn label="Melden" /> : null}
              </div>
            </div>
          );
        })}
      </div>
      <MessageForm conversationId={id} disabled={blocked} />
    </div>
  );
}
