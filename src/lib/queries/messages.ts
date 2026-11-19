import "server-only";
import { db } from "@/lib/db";

/** Anzahl Unterhaltungen mit ungelesenen Nachrichten anderer Teilnehmer. */
export async function countUnreadConversations(userId: string): Promise<number> {
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(DISTINCT cp."conversationId") AS n
    FROM "ConversationParticipant" cp
    JOIN "Message" m ON m."conversationId" = cp."conversationId"
    WHERE cp."userId" = ${userId} AND cp.archived = false AND m."senderId" <> ${userId} AND m.hidden = false
      AND (cp."lastReadAt" IS NULL OR m."createdAt" > cp."lastReadAt")`;
  return Number(rows[0]?.n ?? 0);
}
