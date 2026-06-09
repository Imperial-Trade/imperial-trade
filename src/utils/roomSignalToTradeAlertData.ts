import { getSymbolInfo } from "@/insight/symbolMapper";
import type { TradeAlertData } from "@/types/components";
import type { RoomSignal } from "@/hooks/pattern-stream/types";

type TpRow = { price: number; hit?: boolean };

function tpHitsFromSignal(tps: TpRow[]): number[] {
  return tps
    .map((tp, i) => (tp.hit ? i + 1 : null))
    .filter((n): n is number => n != null);
}

function mapCloseReason(
  signal: RoomSignal,
  tpHits: number[],
  tpCount: number,
): TradeAlertData["close_reason"] | undefined {
  if (signal.status === "closed_loss") return "stop_loss";
  if (signal.status === "canceled") return "manual";
  if (signal.status !== "closed_win") return undefined;

  if (tpHits.length === 0) return "manual";
  if (tpCount > 0 && tpHits.length >= tpCount) return "all_tps_hit";

  const max = Math.max(...tpHits);
  const key = `tp${max}` as const;
  if (key === "tp1" || key === "tp2" || key === "tp3" || key === "tp4" || key === "tp5") {
    return key;
  }
  return "manual";
}

function mapTradeType(signal: RoomSignal): TradeAlertData["trade_type"] {
  const notes = signal.notes ?? "";
  if (signal.status === "pending") {
    if (/sell\s*limit/i.test(notes) || notes.includes("Sell Limit")) return "sell_limit";
    if (/buy\s*limit/i.test(notes) || notes.includes("Buy Limit")) return "buy_limit";
  }
  return signal.side === "sell" ? "sell" : "buy";
}

function mapStatus(signal: RoomSignal, tpHits: number[]): TradeAlertData["status"] {
  if (signal.status === "pending") return "pending";
  if (signal.status === "active") {
    return tpHits.length > 0 ? "partially_profited" : "active";
  }
  return "closed";
}

/** Maps a `room_signals` row to the Trade Stream `TradeAlertData` shape for `TradeAlertCard`. */
export function roomSignalToTradeAlertData(signal: RoomSignal): TradeAlertData {
  const info = getSymbolInfo(signal.symbol);
  const tps = Array.isArray(signal.tps) ? (signal.tps as TpRow[]) : [];
  const tp_hits = tpHitsFromSignal(tps);
  const levels = tps.map((t) => t.price);

  const alert: TradeAlertData = {
    id: signal.id,
    asset_name: info.displayName,
    tradermade_symbol: signal.symbol.trim().toUpperCase(),
    trade_type: mapTradeType(signal),
    entry_price: Number(signal.entry),
    stop_loss: Number(signal.sl ?? signal.entry),
    status: mapStatus(signal, tp_hits),
    tp_hits: tp_hits.length > 0 ? tp_hits : undefined,
    close_reason: mapCloseReason(signal, tp_hits, tps.length),
    notes: signal.notes ?? undefined,
    created_date: signal.created_at,
    updated_date: signal.closed_at ?? signal.updated_at,
  };

  if (levels[0] != null) alert.tp1 = levels[0];
  if (levels[1] != null) alert.tp2 = levels[1];
  if (levels[2] != null) alert.tp3 = levels[2];
  if (levels[3] != null) alert.tp4 = levels[3];
  if (levels[4] != null) alert.tp5 = levels[4];

  return alert;
}
