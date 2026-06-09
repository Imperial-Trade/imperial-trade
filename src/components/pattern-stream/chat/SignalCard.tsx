import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown, Target, ShieldWarning, GearSix, Check } from "@phosphor-icons/react";
import { LivePulseDot } from "@/components/pattern-stream/indicators/PresenceDot";
import { cn } from "@/lib/utils";
import { useOptimizedWebSocketPrices } from "@/contexts/OptimizedWebSocketPriceContext";
import { calculatePipsFromPrice, getPipSize } from "@/utils/pipCalculations";
import {
  INSIGHT_CARD_CLASS,
  INSIGHT_FOCUS_RING,
  INSIGHT_STAT_NEGATIVE,
  INSIGHT_STAT_POSITIVE,
  insightChipBase,
  insightChipGreen,
} from "@/insight/insightCardTokens";

export interface SignalCardData {
  symbol: string;
  side: "buy" | "sell";
  entry: number;
  sl: number | null;
  tps: Array<{ price: number; hit?: boolean }>;
  status: "pending" | "active" | "closed_win" | "closed_loss" | "canceled";
  pips?: number;
  notes?: string | null;
}

interface SignalCardProps {
  data: SignalCardData;
  postedBy?: string;
  postedAt?: string;
  surface?: "pattern" | "insight";
  canManage?: boolean;
  onManage?: () => void;
  className?: string;
}

const STATUS_LABELS = {
  pending: "Pending",
  active: "Live",
  closed_win: "Closed win",
  closed_loss: "SL hit",
  canceled: "Canceled",
} as const;

export function SignalCard({
  data,
  postedBy,
  postedAt,
  surface = "pattern",
  canManage,
  onManage,
  className,
}: SignalCardProps) {
  const isInsight = surface === "insight";
  const isBuy = data.side === "buy";
  const { prices } = useOptimizedWebSocketPrices();

  const livePrice = useMemo(() => {
    const row = prices[data.symbol.trim().toUpperCase()];
    const p = row?.price ?? row?.mid;
    return typeof p === "number" && p > 0 ? p : null;
  }, [prices, data.symbol]);

  const unrealizedPips = useMemo(() => {
    if (data.status !== "active" && data.status !== "pending") return null;
    if (livePrice == null) return null;
    const raw = calculatePipsFromPrice(data.entry, livePrice, data.symbol);
    return isBuy ? raw : -raw;
  }, [data.status, data.entry, data.symbol, livePrice, isBuy]);

  const slProximityPct = useMemo(() => {
    if (data.status !== "active" || data.sl == null || livePrice == null) return null;
    const total = Math.abs(data.entry - data.sl);
    if (total === 0) return null;
    const current = Math.abs(livePrice - data.sl);
    return Math.max(0, Math.min(100, ((total - current) / total) * 100));
  }, [data.status, data.entry, data.sl, livePrice]);

  const accentColor = isInsight
    ? data.status === "active"
      ? "text-emerald-500"
      : data.status === "closed_win"
        ? INSIGHT_STAT_POSITIVE
        : data.status === "closed_loss"
          ? INSIGHT_STAT_NEGATIVE
          : "text-muted-foreground"
    : data.status === "active"
      ? "var(--ps-yellow-green)"
      : data.status === "closed_win"
        ? "var(--ps-green)"
        : data.status === "closed_loss"
          ? "var(--ps-negative)"
          : "var(--ps-text-tertiary)";

  const stripeColor = isInsight
    ? data.status === "active"
      ? "#22c55e"
      : data.status === "closed_win"
        ? "#10b981"
        : data.status === "closed_loss"
          ? "#f43f5e"
          : "hsl(var(--muted-foreground))"
    : accentColor;

  const hitGreen = isInsight ? "rgb(16 185 129)" : "var(--ps-green)";
  const hitGreenGlow = isInsight
    ? "0 0 12px rgba(16, 185, 129, 0.35)"
    : "var(--ps-green-glow)";

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden insight-signal-card",
        isInsight ? INSIGHT_CARD_CLASS : "liquid-glass",
        className,
      )}
      style={isInsight ? { padding: 14 } : { padding: 14, borderRadius: 20 }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{
          background: stripeColor,
          boxShadow: !isInsight && data.status === "active" ? "var(--ps-yellow-green-glow)" : undefined,
        }}
      />

      <div className="ml-2 flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
            isBuy
              ? "border-emerald-500/40 bg-emerald-500/15"
              : "border-rose-500/40 bg-rose-500/15",
          )}
        >
          {isBuy ? (
            <ArrowUp size={16} weight="bold" className="text-emerald-500" />
          ) : (
            <ArrowDown size={16} weight="bold" className="text-rose-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn("text-base font-bold", isInsight ? "text-foreground" : undefined)}
              style={isInsight ? undefined : { color: "var(--ps-text)" }}
            >
              {data.symbol}
            </span>
            <span
              className={cn(
                isInsight ? insightChipBase : "ps-chip",
                isInsight
                  ? isBuy
                    ? insightChipGreen
                    : "border-rose-500/35 bg-muted/40 text-rose-600 dark:text-rose-400"
                  : undefined,
              )}
              style={
                isInsight
                  ? { height: 22, fontSize: 11 }
                  : {
                      height: 22,
                      fontSize: 11,
                      color: isBuy ? "var(--ps-green)" : "var(--ps-negative)",
                      borderColor: isBuy ? "var(--ps-green)" : "var(--ps-negative)",
                    }
              }
            >
              {isBuy ? "BUY" : "SELL"}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={data.status}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.32 }}
                className={cn(
                  isInsight ? insightChipBase : "ps-chip",
                  isInsight && "border-border/60 bg-muted/40",
                  typeof accentColor === "string" && accentColor.startsWith("text-") ? accentColor : undefined,
                )}
                style={
                  isInsight
                    ? { height: 22, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }
                    : {
                        height: 22,
                        fontSize: 11,
                        color: accentColor,
                        borderColor: accentColor,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }
                }
              >
                {data.status === "active" && <LivePulseDot />}
                {STATUS_LABELS[data.status]}
              </motion.span>
            </AnimatePresence>
          </div>
          {(postedBy || postedAt) && (
            <div
              className={cn("text-[11px]", isInsight ? "text-muted-foreground" : undefined)}
              style={isInsight ? undefined : { color: "var(--ps-text-tertiary)" }}
            >
              {postedBy ? `${postedBy} · ` : ""}
              {postedAt
                ? new Date(postedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : ""}
            </div>
          )}
        </div>

        {typeof data.pips === "number" && data.pips !== 0 && (
          <div
            className={cn(
              "text-base font-bold tabular-nums",
              data.pips >= 0
                ? isInsight
                  ? INSIGHT_STAT_POSITIVE
                  : undefined
                : isInsight
                  ? INSIGHT_STAT_NEGATIVE
                  : undefined,
              !isInsight && "ps-numeric",
            )}
            style={
              isInsight
                ? undefined
                : {
                    fontSize: 16,
                    fontWeight: 700,
                    color: data.pips >= 0 ? "var(--ps-yellow-green)" : "var(--ps-negative)",
                  }
            }
          >
            {data.pips >= 0 ? "+" : ""}
            {data.pips.toFixed(2)} pips
          </div>
        )}

        {canManage && onManage && (
          <button
            type="button"
            onClick={onManage}
            className={cn(
              "shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted/40 hover:text-[var(--insight-gold)]",
              isInsight && INSIGHT_FOCUS_RING,
            )}
            aria-label="Manage signal"
          >
            <GearSix size={18} />
          </button>
        )}
      </div>

      {data.status === "active" && livePrice != null && (
        <div
          className={cn(
            "ml-2 mt-3 flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5",
            isInsight ? "border-border/50 bg-muted/30" : "liquid-glass--inset",
          )}
          style={isInsight ? undefined : { borderRadius: 10 }}
        >
          <span
            className={cn("text-[10px] font-medium uppercase tracking-wide", isInsight && "text-muted-foreground")}
            style={isInsight ? undefined : { color: "var(--ps-text-tertiary)" }}
          >
            Live
          </span>
          <span
            className={cn("text-sm font-semibold tabular-nums", isInsight ? "text-foreground" : "ps-numeric")}
            style={isInsight ? undefined : { color: "var(--ps-text)" }}
          >
            {livePrice.toFixed(getPriceDecimals(data.symbol))}
          </span>
          {unrealizedPips != null && (
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                unrealizedPips >= 0
                  ? isInsight
                    ? INSIGHT_STAT_POSITIVE
                    : undefined
                  : isInsight
                    ? INSIGHT_STAT_NEGATIVE
                    : undefined,
              )}
              style={
                isInsight
                  ? undefined
                  : {
                      color: unrealizedPips >= 0 ? "var(--ps-green)" : "var(--ps-negative)",
                    }
              }
            >
              {unrealizedPips >= 0 ? "+" : ""}
              {unrealizedPips.toFixed(2)} pips
            </span>
          )}
        </div>
      )}

      <div className="ml-2 mt-3 grid grid-cols-3 gap-2">
        <PriceRow label="Entry" value={data.entry} symbol={data.symbol} isInsight={isInsight} />
        <PriceRow
          label="SL"
          value={data.sl ?? 0}
          symbol={data.symbol}
          accent={data.status === "closed_loss" ? "negative" : undefined}
          icon={<ShieldWarning size={12} />}
          isInsight={isInsight}
          slProximityPct={slProximityPct}
          slHit={data.status === "closed_loss"}
        />
        <div>
          <div
            className={cn("text-[10px]", isInsight ? "text-muted-foreground" : undefined)}
            style={isInsight ? undefined : { color: "var(--ps-text-tertiary)" }}
          >
            Targets
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {data.tps.map((tp, i) => (
              <motion.span
                key={i}
                layout
                className={cn(isInsight ? insightChipBase : "ps-chip", isInsight && !tp.hit && "border-border/60 bg-muted/40")}
                style={{
                  height: 22,
                  fontSize: 11,
                  borderColor: tp.hit ? hitGreen : undefined,
                  color: tp.hit ? hitGreen : isInsight ? undefined : "var(--ps-text)",
                  boxShadow: tp.hit ? hitGreenGlow : undefined,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                animate={tp.hit ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
              >
                {tp.hit ? (
                  <Check size={10} weight="bold" style={{ color: hitGreen }} />
                ) : (
                  <Target size={10} weight="regular" />
                )}
                <span className={isInsight ? "tabular-nums" : "ps-numeric"}>
                  {tp.price.toFixed(getPriceDecimals(data.symbol))}
                </span>
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {data.notes && (
        <p
          className={cn("ml-2 mt-3 text-[13px]", isInsight ? "text-muted-foreground" : undefined)}
          style={isInsight ? undefined : { color: "var(--ps-text-secondary)" }}
        >
          {data.notes}
        </p>
      )}
    </motion.div>
  );
}

function getPriceDecimals(symbol: string): number {
  const u = symbol.toUpperCase();
  if (["BTCUSD", "XAUUSD", "U30USD", "SPXUSD", "NDXUSD"].includes(u)) return 2;
  return getPipSize(u) < 0.001 ? 5 : 2;
}

function PriceRow({
  label,
  value,
  symbol,
  accent,
  icon,
  isInsight,
  slProximityPct,
  slHit,
}: {
  label: string;
  value: number;
  symbol: string;
  accent?: "negative";
  icon?: React.ReactNode;
  isInsight: boolean;
  slProximityPct?: number | null;
  slHit?: boolean;
}) {
  const showSlWarn =
    label === "SL" && slProximityPct != null && slProximityPct >= 55 && !slHit;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 text-[10px]",
          isInsight ? "text-muted-foreground" : undefined,
          showSlWarn && (isInsight ? "text-rose-500" : undefined),
        )}
        style={
          isInsight
            ? showSlWarn
              ? undefined
              : undefined
            : { color: showSlWarn ? "var(--ps-negative)" : "var(--ps-text-tertiary)" }
        }
      >
        {icon}
        {label}
        {showSlWarn && <span className="font-semibold">· near</span>}
      </div>
      <div
        className={cn(
          "text-sm font-semibold tabular-nums",
          accent === "negative" && (isInsight ? INSIGHT_STAT_NEGATIVE : undefined),
          isInsight && accent !== "negative" ? "text-foreground" : undefined,
          !isInsight && "ps-numeric",
          showSlWarn && !isInsight && undefined,
        )}
        style={
          isInsight
            ? showSlWarn
              ? { color: "rgb(244 63 94)" }
              : undefined
            : {
                fontSize: 14,
                fontWeight: 600,
                color:
                  accent === "negative"
                    ? "var(--ps-negative)"
                    : showSlWarn
                      ? "var(--ps-negative)"
                      : "var(--ps-text)",
              }
        }
      >
        {value > 0 ? value.toFixed(getPriceDecimals(symbol)) : "—"}
      </div>
    </div>
  );
}
