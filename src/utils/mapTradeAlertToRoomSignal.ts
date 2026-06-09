import type { TradeAlertSubmissionData } from "@/hooks/useOptimizedTradeAlertForm";

export function tradeAlertSide(data: TradeAlertSubmissionData): "buy" | "sell" {
  return data.trade_type === "buy" || data.trade_type === "buy_limit" ? "buy" : "sell";
}

export function tradeAlertNotes(data: TradeAlertSubmissionData): string | null {
  const parts: string[] = [];
  if (data.trade_type === "buy_limit" || data.trade_type === "sell_limit") {
    const label = data.trade_type === "buy_limit" ? "Buy Limit" : "Sell Limit";
    parts.push(`Order type: ${label}`);
  }
  if (data.notes?.trim()) parts.push(data.notes.trim());
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function tradeAlertTakeProfits(data: TradeAlertSubmissionData): Array<{ price: number }> {
  return [data.tp1, data.tp2, data.tp3, data.tp4, data.tp5]
    .filter((tp): tp is number => tp != null && !Number.isNaN(tp))
    .map((price) => ({ price }));
}

export function buildRoomSignalInsert(
  data: TradeAlertSubmissionData,
  roomId: string,
  providerId: string,
) {
  return {
    room_id: roomId,
    provider_id: providerId,
    symbol: data.tradermade_symbol,
    side: tradeAlertSide(data),
    entry: data.entry_price,
    sl: data.stop_loss,
    tps: tradeAlertTakeProfits(data) as never,
    notes: tradeAlertNotes(data),
    status: (data.status === "pending" ? "pending" : "active") as "pending" | "active",
    source: "manual" as const,
  };
}
