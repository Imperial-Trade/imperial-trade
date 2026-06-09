import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { orderflowCommentsPageColumnClassName } from "@/insight/orderflowChrome";
import type { ChatMessage } from "@/hooks/pattern-stream/useRoomMessages";
import type { MessageAuthorMeta } from "@/components/pattern-stream/chat/MessageList";

interface InsightRoomMessageSearchProps {
  roomId: string;
  query: string;
  searchSuffix: string;
  authors: Record<string, MessageAuthorMeta>;
  onResultSelect?: () => void;
}

function messageText(content: unknown): string {
  if (content && typeof content === "object" && "text" in content) {
    const t = (content as { text?: unknown }).text;
    return typeof t === "string" ? t : "";
  }
  return "";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function highlightSnippet(text: string, query: string): ReactNode {
  const q = (query ?? '').trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="rounded-sm bg-[var(--insight-gold-soft)] px-0.5 text-foreground">{match}</mark>
      {after}
    </>
  );
}

export function InsightRoomMessageSearch({
  roomId,
  query,
  searchSuffix,
  authors,
  onResultSelect,
}: InsightRoomMessageSearchProps) {
  const navigate = useNavigate();
  const trimmed = (query ?? '').trim();

  const { data: results = [], isFetching } = useQuery({
    enabled: trimmed.length >= 1 && !!roomId,
    queryKey: ["pattern-stream", "room-message-search", roomId, trimmed.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_messages")
        .select("*")
        .eq("room_id", roomId)
        .in("type", ["text", "system"])
        .is("deleted_for", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const needle = trimmed.toLowerCase();
      return ((data ?? []) as ChatMessage[]).filter((m) =>
        messageText(m.content).toLowerCase().includes(needle),
      );
    },
    staleTime: 15_000,
  });

  const grouped = useMemo(() => results.slice(0, 40), [results]);

  return (
    <div
      className={cn(
        orderflowCommentsPageColumnClassName,
        "flex min-h-0 flex-1 flex-col overflow-hidden",
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 md:px-6">
        {trimmed.length < 1 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Search messages in this room
          </p>
        ) : isFetching && grouped.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Searching…</p>
        ) : grouped.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages matching &ldquo;{trimmed}&rdquo;
          </p>
        ) : (
          <ul className="space-y-1">
            {grouped.map((m) => {
              const text = messageText(m.content);
              const author = m.user_id ? authors[m.user_id] : undefined;
              const name = author?.name ?? "Member";
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onResultSelect?.();
                      navigate(
                        `/dashboard/pattern-stream/room/${roomId}/chat${searchSuffix}&msg=${m.id}`,
                      );
                    }}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                      "hover:bg-muted/40 active:bg-muted/55",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-[var(--insight-gold)]">
                        {name}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {formatWhen(m.created_at)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-snug text-foreground">
                      {highlightSnippet(text, trimmed)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
