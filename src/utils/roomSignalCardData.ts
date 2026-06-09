import type { SignalCardData } from "@/components/pattern-stream/chat/SignalCard";
import type { RoomSignal } from "@/hooks/pattern-stream/types";

/** Fallback row when realtime `room_signals` has not loaded yet. */
export function snapshotToRoomSignal(
  signalId: string,
  roomId: string,
  snapshot: SignalCardData,
  createdAt: string,
): RoomSignal {
  return {
    id: signalId,
    room_id: roomId,
    provider_id: "",
    symbol: snapshot.symbol,
    side: snapshot.side,
    entry: snapshot.entry,
    sl: snapshot.sl,
    tps: snapshot.tps as never,
    status: (snapshot.status ?? "active") as RoomSignal["status"],
    notes: snapshot.notes ?? null,
    pips: snapshot.pips ?? 0,
    created_at: createdAt,
    updated_at: createdAt,
    closed_at: null,
    source: "manual",
  };
}

export function roomSignalToCardData(signal: RoomSignal): SignalCardData {
  return {
    symbol: signal.symbol,
    side: signal.side as "buy" | "sell",
    entry: Number(signal.entry),
    sl: signal.sl == null ? null : Number(signal.sl),
    tps: Array.isArray(signal.tps)
      ? (signal.tps as Array<{ price: number; hit?: boolean }>)
      : [],
    status: signal.status,
    pips: Number(signal.pips ?? 0),
    notes: signal.notes,
  };
}
