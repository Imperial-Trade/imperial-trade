import { useEffect, useMemo } from "react";
import { Outlet, useParams, useNavigate, NavLink, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/SafeThemeProvider";
import { motion } from "framer-motion";
import {
  ChatCircle,
  ChartLineUp,
  Briefcase,
  Users,
  GearSix,
  CaretLeft,
  GraduationCap,
  Sparkle,
  At,
  ChatTeardropDots,
  UserCircle,
} from "@phosphor-icons/react";
import { PsSkeleton } from "@/components/pattern-stream/indicators/PsSkeleton";
import type { Room } from "@/hooks/pattern-stream/types";
import { cn } from "@/lib/utils";
import { INSIGHT_FEED_COMPOSER_STRIP_FIXED_Z } from "@/insight/orderflowChrome";
import { InsightRoomShell } from "@/insight/InsightRoomShell";

export default function RoomLayout() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { search, pathname } = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();

  const fromInsight = useMemo(
    () => new URLSearchParams(search).get("from") === "insight",
    [search],
  );

  /** Orderflow-style full-page room shell for all insight room tabs. */
  const isInsightRoomShell = fromInsight && !!roomId;

  const { data: room, isLoading } = useQuery({
    enabled: !!roomId,
    queryKey: ["pattern-stream", "room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId!)
        .single();
      if (error) throw error;
      return data as Room;
    },
  });

  const { data: membership } = useQuery({
    enabled: !!roomId && !!user,
    queryKey: ["pattern-stream", "membership", roomId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_members")
        .select("role, status")
        .eq("room_id", roomId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const cls = "insight-orderflow-theme";
    if (!fromInsight) return;
    document.documentElement.classList.add(cls);
    return () => {
      document.documentElement.classList.remove(cls);
    };
  }, [fromInsight]);

  useEffect(() => {
    document.body.setAttribute("data-ps-in-room", "true");
    return () => {
      document.body.removeAttribute("data-ps-in-room");
    };
  }, []);

  const isStaff =
    membership?.role === "owner" ||
    membership?.role === "admin" ||
    membership?.role === "provider";

  const headerPad = fromInsight
    ? "px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
    : "px-3 sm:px-4";

  if (isInsightRoomShell) {
    /*
     * PatternStreamLayout already gave us a full-bleed column with no
     * `max-w-[1400px]` / `max-w-lg` constraint and no `pb-8`, so we just
     * fill its height with the sidebar (desktop) + chat column (mobile +
     * desktop). Using `h-full min-h-0` lets the parent flex chain own the
     * exact height instead of forcing a viewport-tall layer that overflows
     * its parent and stacks above the safe-area / composer.
     */
    return (
      <div
        data-ps-root={theme === "light" ? "light" : "dark"}
        className="flex h-full min-h-0 flex-1 overflow-hidden"
        style={{ background: "var(--insight-canvas-bg)" }}
      >
        <InsightStitchSidebar />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <InsightRoomShell room={room} membership={membership} isStaff={isStaff}>
            <Outlet
              context={{
                room,
                membership,
                fromInsight,
                insightCommentsShell: true,
              }}
            />
          </InsightRoomShell>
        </div>
      </div>
    );
  }

  return (
    <div
      data-ps-root={theme === "light" ? "light" : "dark"}
      className={cn(
        "flex min-h-0 flex-1",
        fromInsight && "h-[100dvh] max-h-[100dvh] overflow-hidden bg-background",
      )}
      style={fromInsight ? undefined : { background: "var(--insight-canvas-bg)" }}
    >
      {fromInsight && <InsightStitchSidebar />}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <header
        className={cn(
          "sticky top-0",
          fromInsight
            ? cn(
                "border-b border-border/60 bg-background pt-[max(0.25rem,env(safe-area-inset-top))]",
                INSIGHT_FEED_COMPOSER_STRIP_FIXED_Z,
              )
            : cn("z-[200] liquid-glass"),
        )}
        style={
          fromInsight
            ? undefined
            : {
                borderRadius: 0,
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
              }
        }
      >
        <div className={cn("flex items-center gap-3 py-2", headerPad)}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={cn(
              fromInsight
                ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0"
                : "ps-btn-icon ps-btn-ghost",
            )}
            aria-label="Back"
          >
            <CaretLeft size={20} weight="bold" />
          </button>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center font-semibold",
              fromInsight
                ? "rounded-xl border border-border/60 bg-muted/50 text-sm text-foreground"
                : "flex-shrink-0",
            )}
            style={
              fromInsight
                ? undefined
                : {
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background:
                      "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(164,230,53,0.10))",
                    border: "1px solid var(--ps-border-subtle)",
                  }
            }
          >
            {isLoading ? (
              <PsSkeleton width={36} height={36} rounded="md" />
            ) : (
              <span>{(room?.name ?? "R").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate text-[15px] font-semibold",
                fromInsight ? "text-foreground" : "",
              )}
              style={fromInsight ? undefined : { fontSize: 15, fontWeight: 600, color: "var(--ps-text)" }}
            >
              {isLoading ? <PsSkeleton width={140} height={14} /> : room?.name}
            </div>
            <div
              className={cn(
                "truncate text-xs",
                fromInsight ? "text-muted-foreground" : "",
              )}
              style={
                fromInsight
                  ? undefined
                  : { fontSize: 11, color: "var(--ps-text-tertiary)" }
              }
            >
              {room?.type === "private" ? "Private room" : "Public room"} ·{" "}
              {membership?.status ?? "viewing"}
            </div>
          </div>
        </div>

        <nav
          aria-label="Room"
          className={cn(
            "overflow-x-auto pb-2",
            fromInsight ? cn("gap-1.5 pt-1", headerPad) : "px-2",
          )}
        >
          <div className={cn("flex gap-1", fromInsight && "gap-1.5")}>
            <RoomTab
              to={`/dashboard/pattern-stream/room/${roomId}/chat${search}`}
              icon={<ChatCircle size={16} weight="duotone" />}
              label="Chat"
              insight={fromInsight}
            />
            <RoomTab
              to={`/dashboard/pattern-stream/room/${roomId}/signals${search}`}
              icon={<ChartLineUp size={16} weight="duotone" />}
              label="Signals"
              insight={fromInsight}
            />
            {isStaff && (
              <RoomTab
                to={`/dashboard/pattern-stream/room/${roomId}/requests${search}`}
                icon={<Briefcase size={16} weight="duotone" />}
                label="Requests"
                insight={fromInsight}
              />
            )}
            <RoomTab
              to={`/dashboard/pattern-stream/room/${roomId}/members${search}`}
              icon={<Users size={16} weight="duotone" />}
              label="Members"
              insight={fromInsight}
            />
            <RoomTab
              to={`/dashboard/pattern-stream/room/${roomId}/settings${search}`}
              icon={<GearSix size={16} weight="duotone" />}
              label="Settings"
              insight={fromInsight}
            />
          </div>
        </nav>
      </header>

      <motion.div
        key={roomId}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          fromInsight ? "min-h-0 overflow-hidden bg-background" : "",
        )}
        style={fromInsight ? undefined : { background: "var(--ps-canvas)" }}
      >
        <Outlet
          context={{
            room,
            membership,
            fromInsight,
            insightCommentsShell: false,
          }}
        />
      </motion.div>
      {fromInsight && <InsightStitchBottomNav />}
      </div>
    </div>
  );
}

function RoomTab({
  to,
  icon,
  label,
  insight,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  insight?: boolean;
}) {
  if (insight) {
    return (
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0",
            isActive
              ? "border-transparent bg-muted/50 text-foreground ring-1 ring-border/80"
              : "border-border/40 bg-card/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
          )
        }
        style={{ minHeight: 34 }}
      >
        <span className="flex items-center gap-1.5 [&_svg]:text-current">
          {icon}
          <span>{label}</span>
        </span>
      </NavLink>
    );
  }

  return (
    <NavLink to={to} end>
      {({ isActive }) => (
        <span className="ps-active-pill" data-active={isActive} style={{ height: 34 }}>
          {icon}
          <span style={{ fontSize: 13 }}>{label}</span>
        </span>
      )}
    </NavLink>
  );
}

export interface RoomLayoutContext {
  room: Room | undefined;
  membership: { role: string; status: string } | null | undefined;
  /** True when navigated with `?from=insight` (Insight inbox / discover). */
  fromInsight?: boolean;
  /**
   * Chat tab with `?from=insight`: Orderflow full-page comments shell (no in-layout room header).
   */
  insightCommentsShell?: boolean;
}

/**
 * Stitch-style left sidebar for the Insight room shell.
 * Hidden below md (mobile) — uses the bottom nav instead.
 * Insight wordmark + profile card + Live Classroom stub + light nav.
 */
function InsightStitchSidebar() {
  const { user } = useAuth();
  const displayName =
    (user?.user_metadata as { name?: string; full_name?: string } | undefined)?.name ??
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
    user?.email?.split("@")[0] ??
    "Insight Member";
  const avatarUrl =
    (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside
      className="hidden md:flex flex-col h-full w-[300px] py-6 shrink-0"
      style={{
        background: "var(--insight-surface-bg)",
        borderRight: "1px solid var(--insight-glass-border)",
      }}
    >
      <div className="px-8 mb-10">
        <h1
          className="text-3xl font-bold tracking-tight bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--ps-text), var(--insight-gold))",
          }}
        >
          Insight
        </h1>
      </div>

      <div className="px-6 mb-8">
        <Link
          to="/dashboard/profile"
          className="flex items-center p-3 rounded-2xl transition-colors"
          style={{ background: "var(--insight-divider-pill-bg)" }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-sm shrink-0"
            style={{
              background: "var(--insight-bubble-inbound-bg)",
              border: "1px solid var(--insight-glass-border)",
            }}
          >
            {avatarUrl ? (
              <img alt="" src={avatarUrl} className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontWeight: 600, color: "var(--ps-text)" }}>{initial}</span>
            )}
          </div>
          <div className="flex flex-col ml-3 min-w-0">
            <span className="font-bold truncate" style={{ color: "var(--ps-text)" }}>
              {displayName}
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--ps-text-tertiary)" }}>
              Insight Global
            </span>
          </div>
        </Link>
      </div>

      <div className="px-4 mb-8">
        <h3
          className="px-4 mb-4 text-[11px] font-bold uppercase"
          style={{ letterSpacing: "0.15em", color: "var(--ps-text-tertiary)" }}
        >
          Live Classroom
        </h3>
        <Link
          to="/dashboard/education"
          className="relative group block overflow-hidden rounded-2xl aspect-[16/10] mb-4"
          style={{
            background:
              "linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #050912 100%)",
            boxShadow: "var(--insight-bubble-shadow)",
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span
                className="text-[10px] font-bold uppercase text-white"
                style={{ letterSpacing: "0.1em" }}
              >
                Live Now
              </span>
            </div>
            <p className="text-sm font-semibold text-white leading-tight">
              Advanced Market Entry Strategies
            </p>
          </div>
        </Link>
        <Link
          to="/dashboard/education"
          className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          style={{
            background: "var(--insight-gold-soft)",
            color: "var(--insight-gold)",
          }}
        >
          <GraduationCap size={18} weight="bold" />
          Join Room
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <Link
          to="/dashboard/pattern-stream"
          className="flex items-center gap-4 px-4 py-3 rounded-xl font-bold"
          style={{
            color: "var(--ps-text)",
            background: "var(--insight-divider-pill-bg)",
          }}
        >
          <ChatTeardropDots size={20} weight="fill" />
          <span>All Messages</span>
        </Link>
        <div
          className="flex items-center gap-4 px-4 py-3 rounded-xl"
          style={{ color: "var(--ps-text-tertiary)", opacity: 0.7 }}
          title="Coming soon"
        >
          <At size={20} />
          <span>Mentions</span>
        </div>
        <div
          className="flex items-center gap-4 px-4 py-3 rounded-xl"
          style={{ color: "var(--ps-text-tertiary)", opacity: 0.7 }}
          title="Coming soon"
        >
          <Sparkle size={20} />
          <span>Insights AI</span>
        </div>
      </nav>
    </aside>
  );
}

/**
 * Stitch-style mobile bottom nav. Visible below md only.
 * Chats → My Rooms, Learn → Education, Circle → Discover, Me → profile.
 */
function InsightStitchBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const avatarUrl =
    (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null;
  const initial = (user?.email ?? "M").charAt(0).toUpperCase();

  const items: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    activeIcon?: React.ReactNode;
    to: string;
    matches: (p: string) => boolean;
  }> = [
    {
      id: "chats",
      label: "Chats",
      icon: <ChatCircle size={26} weight="fill" />,
      to: "/dashboard/pattern-stream",
      matches: (p) => p.startsWith("/dashboard/pattern-stream"),
    },
    {
      id: "learn",
      label: "Learn",
      icon: <GraduationCap size={26} />,
      to: "/dashboard/education",
      matches: (p) => p.startsWith("/dashboard/education"),
    },
    {
      id: "circle",
      label: "Circle",
      icon: <Users size={26} />,
      to: "/dashboard/pattern-stream/discover",
      matches: (p) => p === "/dashboard/pattern-stream/discover",
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center h-20 px-4 pb-4 border-t"
      style={{
        background: "var(--insight-glass-bg)",
        borderColor: "var(--insight-glass-border)",
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
      }}
      aria-label="Insight"
    >
      {items.map((item) => {
        const active = item.matches(pathname);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.to)}
            className="flex flex-col items-center justify-center flex-1 h-full pt-1 gap-0.5"
            style={{ color: active ? "var(--insight-gold)" : "var(--ps-text-tertiary)" }}
            aria-label={item.label}
          >
            {item.icon}
            <span
              className="text-[10px] font-bold uppercase mt-1"
              style={{ letterSpacing: "0.08em" }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => navigate("/dashboard/profile")}
        className="flex flex-col items-center justify-center flex-1 h-full pt-1 gap-0.5"
        style={{ color: "var(--ps-text-tertiary)" }}
        aria-label="Profile"
      >
        <div
          className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center"
          style={{
            background: "var(--insight-bubble-inbound-bg)",
            border: "1px solid var(--insight-gold-soft)",
          }}
        >
          {avatarUrl ? (
            <img alt="" src={avatarUrl} className="w-full h-full object-cover" />
          ) : (
            <UserCircle size={26} weight="duotone" />
          )}
        </div>
        <span
          className="text-[10px] font-bold uppercase mt-1"
          style={{ letterSpacing: "0.08em" }}
        >
          Me
        </span>
      </button>
    </nav>
  );
}
