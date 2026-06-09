import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useRoomSignals,
  deriveCanPostSignal,
  type SignalsFilter,
} from "@/hooks/pattern-stream/useRoomSignals";
import { RoomTradeAlertCard } from "@/components/pattern-stream/signals/RoomTradeAlertCard";
import { SignalCard } from "@/components/pattern-stream/chat/SignalCard";
import { roomSignalToCardData } from "@/utils/roomSignalCardData";
import { PsSkeletonSignalCard } from "@/components/pattern-stream/indicators/PsSkeleton";
import { NewSignalSheet } from "@/components/pattern-stream/signals/NewSignalSheet";
import { SignalManageSheet } from "@/components/pattern-stream/signals/SignalManageSheet";
import {
  InsightSignalsFooterNav,
  DEFAULT_INSIGHT_SIGNAL_FOOTER_FILTERS,
} from "@/components/pattern-stream/signals/InsightSignalsFooterNav";
import { ChartLineUp, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { RoomLayoutContext } from "./RoomLayout";
import {
  applyInsightSignalFooterFilters,
  type InsightSignalsFooterFilters,
} from "@/utils/filterRoomSignals";
import { useRoomMembers } from "@/hooks/pattern-stream/useRoomMembers";
import {
  INSIGHT_CARD_CLASS,
  INSIGHT_STAT_NEGATIVE,
  INSIGHT_STAT_POSITIVE,
} from "@/insight/insightCardTokens";
const FILTERS: Array<{ id: SignalsFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "closed", label: "Closed" },
];

export default function SignalsTab() {
  const { room, membership, insightCommentsShell } = useOutletContext<RoomLayoutContext>();
  const { user } = useAuth();
  const { members } = useRoomMembers(room?.id);
  const [filter, setFilter] = useState<SignalsFilter>("all");
  const [footerFilters, setFooterFilters] = useState<InsightSignalsFooterFilters>(
    DEFAULT_INSIGHT_SIGNAL_FOOTER_FILTERS,
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [manageSignalId, setManageSignalId] = useState<string | null>(null);
  const { loading, stats, filterBy, signals } = useRoomSignals(room?.id);
  const canPost = deriveCanPostSignal(room, membership, user?.id);

  const isInsight = Boolean(insightCommentsShell);
  const surface = isInsight ? ("insight" as const) : ("pattern" as const);
  const manageSignal = manageSignalId ? signals.find((s) => s.id === manageSignalId) ?? null : null;

  const providerNames = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      map[m.user_id] = m.profile?.display_name ?? "Provider";
    });
    return map;
  }, [members]);

  const list = useMemo(() => {
    if (isInsight) {
      return applyInsightSignalFooterFilters(signals, footerFilters, providerNames);
    }
    return filterBy(filter);
  }, [isInsight, signals, footerFilters, providerNames, filter, filterBy]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="sticky top-0 z-10 px-3 pb-2 pt-3 sm:px-4"
        style={{ background: isInsight ? "transparent" : "var(--ps-canvas)" }}
      >
        <div className={cn("grid grid-cols-4 gap-2", isInsight ? "mb-0" : "mb-3")}>
          <Stat label="Win rate" value={`${stats.winRate}%`} accent={stats.winRate >= 50 ? "green" : undefined} isInsight={isInsight} />
          <Stat label="Pips +" value={stats.pipsGained.toFixed(2)} accent="green" isInsight={isInsight} />
          <Stat label="Pips -" value={stats.pipsLost.toFixed(2)} accent="negative" isInsight={isInsight} />
          <Stat label="Total" value={stats.total.toString()} isInsight={isInsight} />
        </div>

        {!isInsight && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className="ps-active-pill"
                style={{ height: 32 }}
                data-active={filter === f.id}
              >
                {f.label}
              </button>
            ))}
            <div className="flex-1" />
            {canPost && (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="ps-btn ps-btn-primary ps-btn-sm inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
              >
                <Plus size={14} weight="bold" />
                <span className="hidden sm:inline">Post signal</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto px-3 sm:px-4",
          isInsight
            ? "pb-[calc(3.75rem+env(safe-area-inset-bottom,0px)+8px)]"
            : "pb-6",
        )}
      >
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <PsSkeletonSignalCard key={i} />
            ))}
          </div>
        )}

        {!loading && list.length === 0 && (
          <div
            className={cn(
              "mt-3 flex flex-col items-center justify-center px-6 py-10 text-center",
              isInsight ? INSIGHT_CARD_CLASS : "liquid-glass",
            )}
          >
            <div
              className={cn(
                "mb-3 flex h-16 w-16 items-center justify-center rounded-2xl",
                isInsight ? "bg-muted/40" : "liquid-glass--green",
              )}
              style={isInsight ? undefined : { background: "var(--ps-glass-bg-elev)" }}
            >
              <ChartLineUp
                size={32}
                weight="duotone"
                className={isInsight ? "text-emerald-500" : undefined}
                style={isInsight ? undefined : { color: "var(--ps-green)" }}
              />
            </div>
            <h3 className={cn("text-lg font-semibold", isInsight ? "text-foreground" : undefined)} style={isInsight ? undefined : { color: "var(--ps-text)" }}>
              No signals here
            </h3>
            <p className={cn("mt-1 text-sm", isInsight ? "text-muted-foreground" : undefined)} style={isInsight ? undefined : { color: "var(--ps-text-secondary)" }}>
              {canPost
                ? "Post a signal to get started."
                : "When a provider posts, signals appear here in real time."}
            </p>
          </div>
        )}

        {!loading && list.length > 0 && (
          <motion.div className="space-y-3 pt-3" layout>
            {list.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.18 }}
              >
                {isInsight ? (
                  <SignalCard
                    data={roomSignalToCardData(s)}
                    surface="insight"
                    postedBy={providerNames[s.provider_id] ?? room?.name}
                    postedAt={s.created_at}
                    canManage={canPost}
                    onManage={() => setManageSignalId(s.id)}
                    className="w-full"
                  />
                ) : (
                  <RoomTradeAlertCard
                    signal={s}
                    roomId={room?.id}
                    canManage={canPost}
                    brandName={room?.name ?? undefined}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {room && (
        <>
          {canPost && (
            <NewSignalSheet
              open={composerOpen}
              onClose={() => setComposerOpen(false)}
              room={room}
              surface={surface}
            />
          )}
          <SignalManageSheet
            open={manageSignalId != null}
            onClose={() => setManageSignalId(null)}
            signal={manageSignal}
            roomId={room.id}
            surface={surface}
          />
        </>
      )}

      {isInsight && (
        <InsightSignalsFooterNav
          roomId={room?.id}
          signals={signals}
          filters={footerFilters}
          onFiltersChange={setFooterFilters}
          canCreateSignals={canPost}
          onCreateAlert={() => setComposerOpen(true)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  isInsight,
}: {
  label: string;
  value: string;
  accent?: "green" | "negative";
  isInsight?: boolean;
}) {
  if (isInsight) {
    return (
      <div className={cn(INSIGHT_CARD_CLASS, "px-2 py-1.5")}>
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div
          className={cn(
            "text-sm font-semibold tabular-nums",
            accent === "green" && INSIGHT_STAT_POSITIVE,
            accent === "negative" && INSIGHT_STAT_NEGATIVE,
            !accent && "text-foreground",
          )}
        >
          {value}
        </div>
      </div>
    );
  }

  return (
    <div className="liquid-glass px-2 py-1.5" style={{ borderRadius: 12 }}>
      <div style={{ fontSize: 10, color: "var(--ps-text-tertiary)" }}>{label}</div>
      <div
        className="ps-numeric"
        style={{
          fontSize: 14,
          fontWeight: 600,
          color:
            accent === "green"
              ? "var(--ps-green)"
              : accent === "negative"
                ? "var(--ps-negative)"
                : "var(--ps-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
