import { useEffect, useMemo, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  ChartLineUp,
  ChatCircle,
  GearSix,
  MagnifyingGlass,
  Users,
} from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useRoomMembers } from "@/hooks/pattern-stream/useRoomMembers";
import type { Room } from "@/hooks/pattern-stream/types";
import { InsightFeedCommentsStrip } from "@/insight/InsightFeedCommentsStrip";
import { InsightRoomMessageSearch } from "@/insight/InsightRoomMessageSearch";
import {
  InsightRoomShellProvider,
  useInsightRoomShell,
} from "@/insight/InsightRoomShellContext";
import type { MessageAuthorMeta } from "@/components/pattern-stream/chat/MessageList";

interface InsightRoomShellProps {
  room: Room | undefined;
  membership: { role: string; status: string } | null | undefined;
  isStaff: boolean;
  children: ReactNode;
}

function shellTabClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0",
    isActive
      ? "border-transparent text-foreground"
      : "border-border/40 bg-card/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
  );
}

function shellTabActiveStyle(isActive: boolean) {
  return isActive
    ? ({
        background: "var(--insight-gold-soft)",
        color: "var(--insight-gold)",
        boxShadow: "inset 0 0 0 1px var(--insight-gold)",
      } as const)
    : undefined;
}

function InsightRoomShellInner({
  room,
  membership,
  isStaff,
  children,
}: InsightRoomShellProps) {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const search = location.search;

  const {
    roomNavOpen,
    setRoomNavOpen,
    searchOpen,
    openSearch,
    closeSearch,
    searchQuery,
    setSearchQuery,
    replyHeader,
  } = useInsightRoomShell();

  const { members: roomMembers } = useRoomMembers(room?.id);

  const activeMemberPreview = useMemo(() => {
    const active = roomMembers.filter((m) => m.status === "active");
    return {
      count: active.length,
      avatars: active.slice(0, 3).map((m) => ({
        avatarUrl: m.profile?.avatar_url,
        initial: m.profile?.display_name ?? undefined,
      })),
    };
  }, [roomMembers]);

  const isChatPath =
    !!roomId &&
    (location.pathname === `/dashboard/pattern-stream/room/${roomId}` ||
      location.pathname === `/dashboard/pattern-stream/room/${roomId}/chat`);

  const searchAuthors = useMemo(() => {
    const map: Record<string, MessageAuthorMeta> = {};
    roomMembers.forEach((m) => {
      if (!m.user_id) return;
      map[m.user_id] = {
        name: m.profile?.display_name ?? "Member",
        avatarUrl: m.profile?.avatar_url,
      };
    });
    return map;
  }, [roomMembers]);

  const { data: extraSearchAuthors } = useQuery({
    enabled: searchOpen && !!roomId,
    queryKey: ["pattern-stream", "room-search-authors", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_messages")
        .select("user_id")
        .eq("room_id", roomId!)
        .limit(300);
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
      if (ids.length === 0) {
        return [] as Array<{ id: string; display_name: string | null; avatar_url: string | null }>;
      }
      const { data: prof } = await supabase
        .from("public_profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      return prof ?? [];
    },
    staleTime: 60_000,
  });

  const mergedAuthors = useMemo(() => {
    const map = { ...searchAuthors };
    (extraSearchAuthors ?? []).forEach((p) => {
      map[p.id] = {
        name: p.display_name ?? "Member",
        avatarUrl: p.avatar_url,
      };
    });
    return map;
  }, [searchAuthors, extraSearchAuthors]);

  useEffect(() => {
    closeSearch();
  }, [location.pathname, closeSearch]);

  const closeNavOnNavigate = () => setRoomNavOpen(false);

  const roomNavExtension =
    roomNavOpen && !searchOpen ? (
      <div
        className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="navigation"
        aria-label="Room sections"
      >
        <NavLink
          to={`/dashboard/pattern-stream/room/${roomId}/chat${search}`}
          onClick={closeNavOnNavigate}
          className={() => shellTabClass({ isActive: isChatPath })}
          style={{ minHeight: 34, ...shellTabActiveStyle(isChatPath) }}
        >
          <span className="flex items-center gap-1.5 [&_svg]:text-current">
            <ChatCircle size={16} weight="duotone" />
            <span>Chat</span>
          </span>
        </NavLink>
        <NavLink
          to={`/dashboard/pattern-stream/room/${roomId}/signals${search}`}
          onClick={closeNavOnNavigate}
          className={shellTabClass}
          style={({ isActive }) => ({ minHeight: 34, ...shellTabActiveStyle(isActive) })}
        >
          <span className="flex items-center gap-1.5 [&_svg]:text-current">
            <ChartLineUp size={16} weight="duotone" />
            <span>Signals</span>
          </span>
        </NavLink>
        {isStaff && (
          <NavLink
            to={`/dashboard/pattern-stream/room/${roomId}/requests${search}`}
            onClick={closeNavOnNavigate}
            className={shellTabClass}
            style={({ isActive }) => ({ minHeight: 34, ...shellTabActiveStyle(isActive) })}
          >
            <span className="flex items-center gap-1.5 [&_svg]:text-current">
              <Briefcase size={16} weight="duotone" />
              <span>Requests</span>
            </span>
          </NavLink>
        )}
        <NavLink
          to={`/dashboard/pattern-stream/room/${roomId}/members${search}`}
          onClick={closeNavOnNavigate}
          className={shellTabClass}
          style={({ isActive }) => ({ minHeight: 34, ...shellTabActiveStyle(isActive) })}
        >
          <span className="flex items-center gap-1.5 [&_svg]:text-current">
            <Users size={16} weight="duotone" />
            <span>Members</span>
          </span>
        </NavLink>
        <NavLink
          to={`/dashboard/pattern-stream/room/${roomId}/settings${search}`}
          onClick={closeNavOnNavigate}
          className={shellTabClass}
          style={({ isActive }) => ({ minHeight: 34, ...shellTabActiveStyle(isActive) })}
        >
          <span className="flex items-center gap-1.5 [&_svg]:text-current">
            <GearSix size={16} weight="duotone" />
            <span>Settings</span>
          </span>
        </NavLink>
        <button
          type="button"
          onClick={() => {
            closeNavOnNavigate();
            openSearch();
          }}
          className={shellTabClass({ isActive: searchOpen })}
          style={{ minHeight: 34, ...shellTabActiveStyle(searchOpen) }}
        >
          <span className="flex items-center gap-1.5 [&_svg]:text-current">
            <MagnifyingGlass size={16} weight="duotone" />
            <span>Search</span>
          </span>
        </button>
      </div>
    ) : null;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden overflow-x-hidden",
        !isChatPath &&
          "pb-[max(1rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+1.25rem))]",
      )}
    >
      <InsightFeedCommentsStrip
        overlayHeader={isChatPath}
        onBack={() => (searchOpen ? closeSearch() : navigate(-1))}
        primaryTitle={room?.name ?? "Room"}
        avatarInitial={room?.name ?? "R"}
        avatarUrl={room?.avatar_url}
        presence={
          !membership ? false : membership.status === "active" ? "active" : "inactive"
        }
        replyActive={replyHeader.active}
        replySubtitle={replyHeader.subtitle}
        activeMemberCount={searchOpen || replyHeader.active ? undefined : activeMemberPreview.count}
        activeMemberAvatars={
          searchOpen || replyHeader.active ? undefined : activeMemberPreview.avatars
        }
        searchActive={searchOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        roomNavOpen={roomNavOpen}
        onToggleRoomNav={() => setRoomNavOpen((open) => !open)}
        headerExtension={roomNavExtension}
      />

      {searchOpen && roomId ? (
        <InsightRoomMessageSearch
          roomId={roomId}
          query={searchQuery}
          searchSuffix={search}
          authors={mergedAuthors}
          onResultSelect={closeSearch}
        />
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      )}
    </div>
  );
}

export function InsightRoomShell(props: InsightRoomShellProps) {
  return (
    <InsightRoomShellProvider>
      <InsightRoomShellInner {...props} />
    </InsightRoomShellProvider>
  );
}
