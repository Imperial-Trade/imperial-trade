import { getSymbolInfo } from "@/insight/symbolMapper";
import type { RoomSignal } from "@/hooks/pattern-stream/types";
import { calculatePipsForSignal, type PipsData } from "@/utils/pipsCalculator";

export type SignalUpdateNotificationType =
  | "tp_hit"
  | "stop_loss"
  | "notes_updated"
  | "manual_close"
  | "limit_activated"
  | "trade_closed"
  | "new_signal";

export interface RoomSignalUpdateNotification {
  type: SignalUpdateNotificationType;
  title: string;
  message: string;
  assetName: string;
  providerName: string;
  pipsData?: PipsData;
}

function resolveTradeType(signal: RoomSignal): "buy" | "sell" | "buy_limit" | "sell_limit" {
  const notes = signal.notes ?? "";
  if (signal.status === "pending") {
    if (/sell\s*limit/i.test(notes) || notes.includes("Sell Limit")) return "sell_limit";
    if (/buy\s*limit/i.test(notes) || notes.includes("Buy Limit")) return "buy_limit";
  }
  return signal.side === "sell" ? "sell" : "buy";
}

/** Matches ModernNotificationSystem / iOS notification center copy for room signal updates. */
export function formatRoomSignalUpdateNotification(
  updateType: string,
  value: unknown,
  signal?: RoomSignal | null,
  providerName?: string,
): RoomSignalUpdateNotification {
  const v = value as Record<string, unknown> | null | undefined;
  const assetName = signal ? getSymbolInfo(signal.symbol).displayName : "Signal";
  const provider = providerName?.trim() || "Provider";
  const entry = signal ? Number(signal.entry) : 0;
  const tradeType = signal ? resolveTradeType(signal) : "buy";

  switch (updateType) {
    case "tp_hit": {
      const tpNumber = typeof v?.tp_index === "number" ? v.tp_index + 1 : 1;
      const tpPrice = typeof v?.price === "number" ? v.price : null;
      let pipsData: PipsData | undefined;
      if (tpPrice != null && signal) {
        pipsData = calculatePipsForSignal(entry, tpPrice, signal.symbol, tradeType);
      }
      return {
        type: "tp_hit",
        title: "🎯 Take Profit Hit",
        message: `TP (${tpNumber}) HIT on ${assetName} at $${tpPrice != null ? tpPrice.toFixed(2) : "N/A"}${
          pipsData?.formatted ? ` | ${pipsData.formatted}` : ""
        }`,
        assetName,
        providerName: provider,
        pipsData,
      };
    }
    case "sl_hit": {
      const slPrice =
        signal?.sl != null
          ? Number(signal.sl)
          : typeof v?.price === "number"
            ? v.price
            : null;
      let pipsData: PipsData | undefined;
      if (slPrice != null && signal) {
        pipsData = calculatePipsForSignal(entry, slPrice, signal.symbol, tradeType);
        if (pipsData.direction === "profit") {
          pipsData = {
            ...pipsData,
            value: -Math.abs(pipsData.value),
            formatted: `-${pipsData.formatted.replace(/^[+-]/, "")}`,
            direction: "loss",
          };
        }
      } else if (typeof v?.pips === "number") {
        const abs = Math.abs(Number(v.pips));
        pipsData = {
          value: -abs,
          formatted: `-${abs.toFixed(2)} PIPS`,
          direction: "loss",
        };
      }
      return {
        type: "stop_loss",
        title: "▼ Stop Loss Hit",
        message: `SL HIT on ${assetName} at $${slPrice != null ? slPrice.toFixed(2) : "N/A"}${
          pipsData?.formatted ? ` | ${pipsData.formatted}` : ""
        }`,
        assetName,
        providerName: provider,
        pipsData,
      };
    }
    case "edit":
      return {
        type: "notes_updated",
        title: "📝 Notes Updated",
        message: `Recent notes update for ${assetName}${signal?.notes ? `\n⚞ ${signal.notes}` : ""}`,
        assetName,
        providerName: provider,
      };
    case "cancel":
      return {
        type: "manual_close",
        title: "🔒 Manually Closed",
        message: `Signal canceled on ${assetName}`,
        assetName,
        providerName: provider,
      };
    case "note":
      if (v?.action === "closed_win") {
        const pips = typeof v?.pips === "number" ? Number(v.pips) : Number(signal?.pips ?? 0);
        const pipsData: PipsData | undefined =
          pips > 0
            ? {
                value: pips,
                formatted: `+${pips.toFixed(2)} PIPS`,
                direction: "profit",
              }
            : undefined;
        return {
          type: "trade_closed",
          title: "💰 Closed In Profits",
          message: `Secured profits on ${assetName}${pipsData ? ` | ${pipsData.formatted}` : ""}`,
          assetName,
          providerName: provider,
          pipsData,
        };
      }
      return {
        type: "notes_updated",
        title: "Signal updated",
        message: `Update on ${assetName}`,
        assetName,
        providerName: provider,
      };
    default:
      return {
        type: "notes_updated",
        title: "Signal updated",
        message: `Update on ${assetName}`,
        assetName,
        providerName: provider,
      };
  }
}
