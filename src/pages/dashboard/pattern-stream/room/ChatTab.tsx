import { useState, useMemo, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { useVisualKeyboardInset } from "@/hooks/useVisualKeyboardInset";
import { useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useRoomMessages, type ChatMessage } from "@/hooks/pattern-stream/useRoomMessages";
import { useMessageReactions } from "@/hooks/pattern-stream/useMessageReactions";
import { useRoomRealtime } from "@/hooks/pattern-stream/useRoomRealtime";
import { MessageList, type MessageAuthorMeta, type MessageListHandle } from "@/components/pattern-stream/chat/MessageList";
import {
  MessageComposer,
  type MessageComposerHandle,
} from "@/components/pattern-stream/chat/MessageComposer";
import { ConnectionBanner } from "@/components/pattern-stream/indicators/ConnectionBanner";
import { NewSignalSheet } from "@/components/pattern-stream/signals/NewSignalSheet";
import { SignalManageSheet } from "@/components/pattern-stream/signals/SignalManageSheet";
import type { RoomSignal } from "@/hooks/pattern-stream/types";
import { deriveCanPostSignal } from "@/hooks/pattern-stream/useRoomSignals";
import type { RoomLayoutContext } from "./RoomLayout";
import { useInsightRoomShellOptional } from "@/insight/InsightRoomShellContext";
import { orderflowCommentsPageColumnClassName } from "@/insight/orderflowChrome";
import {
  readInsightRoomLastVisited,
  markInsightRoomVisited,
} from "@/insight/insightChatLastVisited";
import { InsightUnreadJumpPill } from "@/insight/InsightUnreadJumpPill";

interface ProfileLite {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function ChatTab() {
  const { room, membership, fromInsight, insightCommentsShell } = useOutletContext<RoomLayoutContext>();
  const insightShell = useInsightRoomShellOptional();
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const isPending = membership?.status === "pending";
  const canChat = membership?.status === "active" || membership?.status === "muted";
  const canPostSignal = deriveCanPostSignal(room, membership, user?.id);
  const isInsightPath = Boolean(fromInsight || insightCommentsShell);
  const signalCardSurface = isInsightPath ? ("insight" as const) : ("pattern" as const);
  const canDeleteAll =
    membership?.role === "owner" ||
    membership?.role === "admin" ||
    membership?.role === "provider";
  const isStaff =
    membership?.role === "owner" ||
    membership?.role === "admin" ||
    membership?.role === "provider";

  const {
    messages,
    loading,
    hasMore,
    loadOlder,
    sendText,
    editMessage,
    deleteMessage,
    retrySend,
    ensureSignalChatMessage,
    handleRealtimeMessage,
  } = useRoomMessages({ roomId: room?.id, externalRealtime: true });

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { byMessage, toggleReaction, handleRealtimeReaction } = useMessageReactions(messageIds);

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    messages.forEach((m) => {
      if (m.user_id) ids.add(m.user_id);
    });
    return Array.from(ids);
  }, [messages]);

  const { data: authorsData } = useQuery({
    enabled: userIds.length > 0,
    queryKey: ["pattern-stream", "chat-authors", userIds.sort().join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
    staleTime: 60_000,
  });

  const { data: providerSet } = useQuery({
    enabled: !!room?.id && userIds.length > 0,
    queryKey: ["pattern-stream", "chat-providers", room?.id, userIds.sort().join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_members")
        .select("user_id, role")
        .eq("room_id", room!.id)
        .in("user_id", userIds);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((m) => {
        if (m.role === "owner" || m.role === "provider") set.add(m.user_id);
      });
      return set;
    },
    staleTime: 60_000,
  });

  const authors: Record<string, MessageAuthorMeta> = useMemo(() => {
    const map: Record<string, MessageAuthorMeta> = {};
    (authorsData ?? []).forEach((p) => {
      map[p.id] = {
        name: p.display_name ?? "User",
        avatarUrl: p.avatar_url,
        isProvider: providerSet?.has(p.id) ?? false,
      };
    });
    return map;
  }, [authorsData, providerSet]);

  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [signalSheetOpen, setSignalSheetOpen] = useState(false);
  const [manageSignalId, setManageSignalId] = useState<string | null>(null);
  const [signalsById, setSignalsById] = useState<Record<string, RoomSignal>>({});
  const composerRef = useRef<MessageComposerHandle | null>(null);
  const messageListRef = useRef<MessageListHandle | null>(null);

  useEffect(() => {
    if (!room?.id) {
      setSignalsById({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("room_signals")
        .select("*")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled || error) return;
      const map: Record<string, RoomSignal> = {};
      (data ?? []).forEach((row) => {
        map[row.id] = row as RoomSignal;
      });
      setSignalsById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [room?.id]);

  const { status, broadcastTyping } = useRoomRealtime(room?.id, user?.id, {
    onMessage: handleRealtimeMessage,
    onSignal: ({ eventType, new: row, old }) => {
      if (eventType === "INSERT" && row) {
        const rec = row as RoomSignal;
        setSignalsById((prev) => ({ ...prev, [rec.id]: rec }));
      }
      if (eventType === "UPDATE" && row) {
        const rec = row as RoomSignal;
        setSignalsById((prev) => ({ ...prev, [rec.id]: rec }));
      }
      if (eventType === "DELETE" && old) {
        const id = (old as { id?: string }).id;
        if (id) {
          setSignalsById((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      }
    },
    onReaction: ({ eventType, new: row, old }) => {
      const target = (row ?? old) as { message_id?: string; user_id?: string; emoji?: string } | null;
      if (target?.message_id && target.user_id && target.emoji) {
        handleRealtimeReaction(eventType as "INSERT" | "DELETE", {
          message_id: target.message_id,
          user_id: target.user_id,
          emoji: target.emoji,
        });
      }
    },
    onTyping: ({ user_id, is_typing }) => {
      if (user_id === user?.id) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (is_typing) next.add(user_id);
        else next.delete(user_id);
        return next;
      });
    },
  });

  useEffect(() => {
    if (typingUsers.size === 0) return;
    const t = window.setTimeout(() => setTypingUsers(new Set()), 4000);
    return () => window.clearTimeout(t);
  }, [typingUsers]);

  const lastVisitedIso = useMemo(() => {
    if (!user?.id || !roomId) return undefined;
    return readInsightRoomLastVisited(user.id, roomId);
  }, [user?.id, roomId]);

  const { data: serverUnreadCount = 0 } = useQuery({
    enabled: Boolean(user?.id && roomId && lastVisitedIso),
    queryKey: ["insight", "room-unread-count", roomId, lastVisitedIso],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("room_messages")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId!)
        .gt("created_at", lastVisitedIso!)
        .is("deleted_for", null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 0,
  });

  const [readCleared, setReadCleared] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    setReadCleared(false);
    setAtBottom(false);
  }, [roomId]);

  const pillUnreadCount = readCleared ? 0 : serverUnreadCount;

  /** Messenger-style open: always land on the latest message once the page loads. */
  const initialScrollReady = !loading && messages.length > 0;

  const handleReachedBottom = useCallback(() => {
    if (!user?.id || !roomId || readCleared) return;
    if (pillUnreadCount > 0) return;
    markInsightRoomVisited(user.id, roomId);
    setReadCleared(true);
  }, [user?.id, roomId, readCleared, pillUnreadCount]);

  const handleAtBottomChange = useCallback((next: boolean) => {
    setAtBottom(next);
  }, []);

  const handleUnreadPillClick = useCallback(() => {
    messageListRef.current?.scrollToLatest();
    if (!user?.id || !roomId) return;
    markInsightRoomVisited(user.id, roomId);
    setReadCleared(true);
  }, [user?.id, roomId]);

  useEffect(() => {
    return () => {
      if (atBottom && user?.id && roomId && !readCleared && pillUnreadCount === 0) {
        markInsightRoomVisited(user.id, roomId);
      }
    };
  }, [atBottom, user?.id, roomId, readCleared, pillUnreadCount]);

  const nativeKeyboardInsetPx = useVisualKeyboardInset(Boolean(fromInsight));
  const [composerKeyboardInsetPx, setComposerKeyboardInsetPx] = useState<number | null>(null);
  const keyboardInsetPx = composerKeyboardInsetPx ?? nativeKeyboardInsetPx;

  const onStartEdit = useCallback((message: ChatMessage) => {
    setReply(null);
    setEditingMessage(message);
  }, []);

  const onCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const onSaveEdit = useCallback(
    async (newText: string) => {
      if (!editingMessage) return;
      await editMessage(editingMessage.id, newText);
      setEditingMessage(null);
    },
    [editingMessage, editMessage],
  );

  const onReplyToMessage = useCallback((message: ChatMessage) => {
    setEditingMessage(null);
    setReply(message);
  }, []);

  const onSend = useCallback(
    async (text: string, parentId?: string | null) => {
      await sendText(text, parentId ?? null);
    },
    [sendText],
  );

  /**
   * Audit C4 — retry failed-send optimistic messages from the delivery tick.
   * We prefer the temp id (only present on optimistic rows) so the in-place flip
   * works even if the server eventually races a duplicate INSERT.
   */
  const onRetry = useCallback(
    (msg: ChatMessage) => {
      const id = msg._temp_id ?? msg.id;
      void retrySend(id);
    },
    [retrySend],
  );

  const handleMediaUpload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!user || !room || list.length === 0) return;
      try {
        const urls: string[] = [];
        for (const file of list) {
          const path = `room-messages/${room.id}/${user.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("public_uploads")
            .upload(path, file, { cacheControl: "3600", upsert: false });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("public_uploads").getPublicUrl(path);
          urls.push(pub.publicUrl);
        }
        const allImages = list.every((file) => file.type.startsWith("image/"));
        await supabase.from("room_messages").insert({
          room_id: room.id,
          user_id: user.id,
          type: "media",
          content: {
            kind: allImages ? "image" : "file",
            url: urls[0],
            urls,
            name:
              list.length === 1
                ? list[0].name
                : `${list.length} ${allImages ? "photos" : "files"}`,
          },
        });
      } catch (e) {
        console.warn("[ps-chat] media upload failed", e);
      }
    },
    [user, room],
  );

  const replyPreviewText =
    reply != null
      ? (((reply.content as { text?: string })?.text ?? "").trim() || "Message")
      : null;

  useEffect(() => {
    if (!insightShell) return;
    insightShell.setReplyHeader({
      active: reply != null,
      subtitle: replyPreviewText,
    });
    return () => insightShell.setReplyHeader({ active: false });
  }, [insightShell, reply, replyPreviewText]);

  const sharedHiddenInput = (
    <input
      id="ps-media-upload"
      type="file"
      accept="image/*,video/*"
      multiple
      onChange={(e) => {
        const picked = e.target.files;
        if (picked && picked.length > 0) handleMediaUpload(picked);
        e.target.value = "";
      }}
      style={{ display: "none" }}
    />
  );

  const handleManageSignal = useCallback((signalId: string) => {
    setManageSignalId(signalId);
  }, []);

  const handleSignalPosted = useCallback(
    async (signal: RoomSignal) => {
      setSignalsById((prev) => ({ ...prev, [signal.id]: signal }));
      await ensureSignalChatMessage(signal);
      requestAnimationFrame(() => {
        messageListRef.current?.scrollToLatest();
      });
    },
    [ensureSignalChatMessage],
  );

  const manageSignal = manageSignalId ? signalsById[manageSignalId] ?? null : null;

  const signalSheets = room ? (
    <>
      {canPostSignal && (
        <NewSignalSheet
          open={signalSheetOpen}
          onClose={() => setSignalSheetOpen(false)}
          room={room}
          surface={signalCardSurface}
          onSignalPosted={handleSignalPosted}
        />
      )}
      {canPostSignal && (
        <SignalManageSheet
          open={manageSignalId != null}
          onClose={() => setManageSignalId(null)}
          signal={manageSignal}
          roomId={room.id}
          surface={signalCardSurface}
        />
      )}
    </>
  ) : null;

  const sharedMessageListSignalProps = {
    signalsById,
    signalCardSurface,
    canPostSignal,
    onManageSignal: canPostSignal ? handleManageSignal : undefined,
    roomBrandName: room?.name ?? undefined,
  };

  const sharedComposerSignalProps = {
    canCreateSignal: canPostSignal,
    onOpenCreateSignal: () => setSignalSheetOpen(true),
  };

  const pendingBanner = isPending && (
    <div
      className={cn(
        "mx-3 mt-3 rounded-xl border px-3 py-2 text-[13px]",
        fromInsight || insightCommentsShell
          ? "border-border/60 bg-muted/40 text-muted-foreground"
          : "liquid-glass",
      )}
      style={
        fromInsight || insightCommentsShell
          ? undefined
          : {
              borderRadius: 12,
              fontSize: 13,
              color: "var(--ps-text-secondary)",
            }
      }
    >
      Pending approval. You can see the latest activity but cannot scroll back or send signals until
      approved.
    </div>
  );

  if (insightCommentsShell && roomId) {
    return (
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        style={{ "--keyboard-inset": `${keyboardInsetPx}px` } as CSSProperties}
        data-insight-chat-surface=""
      >
        {sharedHiddenInput}
        {pendingBanner}

        <div className={cn(orderflowCommentsPageColumnClassName, "min-h-0 flex-1")}>
            <div className="relative isolate z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-foreground">
              <div className="pointer-events-auto flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-transparent shadow-none text-foreground">
                <MessageList
                  ref={messageListRef}
                  roomId={room?.id ?? roomId}
                  messages={messages}
                  selfId={user?.id ?? null}
                  authors={authors}
                  reactionsByMessage={byMessage}
                  loading={loading}
                  hasMore={hasMore}
                  onLoadOlder={loadOlder}
                  onReact={toggleReaction}
                  onReply={onReplyToMessage}
                  onStartEdit={onStartEdit}
                  editingMessageId={editingMessage?.id ?? null}
                  onDelete={(m, scope) => deleteMessage(m.id, scope)}
                  onRetry={onRetry}
                  canDeleteAll={canDeleteAll}
                  typingUsers={Array.from(typingUsers)}
                  surface="orderflowComments"
                  threadKeyboardInsetPx={keyboardInsetPx}
                  onScrollInteraction={() => composerRef.current?.blurKeyboard()}
                  initialScrollIntent="latest"
                  initialScrollReady={initialScrollReady}
                  onReachedBottom={handleReachedBottom}
                  onAtBottomChange={handleAtBottomChange}
                  {...sharedMessageListSignalProps}
                />
              </div>
            </div>
          </div>

          <InsightUnreadJumpPill
            count={pillUnreadCount}
            visible={pillUnreadCount > 0 && !atBottom}
            onClick={handleUnreadPillClick}
          />

          <MessageComposer
            ref={composerRef}
            onSend={onSend}
            onTyping={broadcastTyping}
            replyingTo={reply}
            onCancelReply={() => setReply(null)}
            editingMessage={editingMessage}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            disabled={!canChat}
            disabledReason={isPending ? "Awaiting approval to chat" : "Cannot send"}
            variant="insight"
            keyboardInsetPx={nativeKeyboardInsetPx}
            onEffectiveKeyboardInsetChange={setComposerKeyboardInsetPx}
            {...sharedComposerSignalProps}
          />

          {signalSheets}
      </div>
    );
  }

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col", fromInsight && "bg-background")}
      style={
        fromInsight
          ? ({ "--keyboard-inset": `${keyboardInsetPx}px` } as CSSProperties)
          : undefined
      }
      {...(fromInsight ? ({ "data-insight-chat-surface": "" } as const) : {})}
    >
      <ConnectionBanner status={status} variant={fromInsight ? "insight" : "pattern"} />
      {sharedHiddenInput}
      {pendingBanner}

      <MessageList
        roomId={room?.id ?? roomId}
        messages={messages}
        selfId={user?.id ?? null}
        authors={authors}
        reactionsByMessage={byMessage}
        loading={loading}
        hasMore={hasMore}
        onLoadOlder={loadOlder}
        onReact={toggleReaction}
        onReply={onReplyToMessage}
        onStartEdit={onStartEdit}
        editingMessageId={editingMessage?.id ?? null}
        onDelete={(m, scope) => deleteMessage(m.id, scope)}
        onRetry={onRetry}
        canDeleteAll={canDeleteAll}
        typingUsers={Array.from(typingUsers)}
        surface={fromInsight ? "insight" : "pattern"}
        threadKeyboardInsetPx={fromInsight ? keyboardInsetPx : 0}
        onScrollInteraction={
          fromInsight ? () => composerRef.current?.blurKeyboard() : undefined
        }
        {...sharedMessageListSignalProps}
      />

      <MessageComposer
        ref={composerRef}
        onSend={onSend}
        onTyping={broadcastTyping}
        replyingTo={reply}
        onCancelReply={() => setReply(null)}
        editingMessage={editingMessage}
        onCancelEdit={onCancelEdit}
        onSaveEdit={onSaveEdit}
        disabled={!canChat}
        disabledReason={isPending ? "Awaiting approval to chat" : "Cannot send"}
        variant={fromInsight ? "insight" : "pattern"}
        keyboardInsetPx={fromInsight ? nativeKeyboardInsetPx : 0}
        onEffectiveKeyboardInsetChange={
          fromInsight ? (px) => setComposerKeyboardInsetPx(px) : undefined
        }
        {...sharedComposerSignalProps}
      />

      {signalSheets}
    </div>
  );
}
