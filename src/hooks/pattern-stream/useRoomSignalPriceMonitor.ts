import { useEffect, useRef } from "react";
import { useOptimizedWebSocketPrices } from "@/contexts/OptimizedWebSocketPriceContext";
import { calculatePipsFromPrice } from "@/utils/pipCalculations";
import type { RoomSignal } from "./types";
import { useSignalActions } from "./useSignalActions";

type TpRow = { price: number; hit?: boolean };

const DEDUPE_MS = 300_000;

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function getLivePrice(
  prices: Record<string, { price?: number; mid?: number } | undefined>,
  symbol: string,
): number | null {
  const row = prices[normalizeSymbol(symbol)];
  const p = row?.price ?? row?.mid;
  return typeof p === "number" && p > 0 && Number.isFinite(p) ? p : null;
}

/**
 * Provider-side auto TP/SL checks for active room signals (parity with Signal Stream LivePriceWidget).
 * Updates propagate to all clients via room_signals realtime + message sync trigger.
 */
export function useRoomSignalPriceMonitor(
  roomId: string | undefined,
  signals: RoomSignal[],
  enabled: boolean,
) {
  const { prices } = useOptimizedWebSocketPrices();
  const { markTpHit, markSlHit } = useSignalActions(roomId);
  const dedupeRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled || !roomId) return;

    const active = signals.filter((s) => s.status === "active");
    if (active.length === 0) return;

    const shouldFire = (key: string): boolean => {
      const last = dedupeRef.current.get(key);
      const now = Date.now();
      if (last != null && now - last < DEDUPE_MS) return false;
      dedupeRef.current.set(key, now);
      return true;
    };

    for (const signal of active) {
      const price = getLivePrice(prices, signal.symbol);
      if (price == null) continue;

      const entry = Number(signal.entry);
      const sl = signal.sl != null ? Number(signal.sl) : null;
      const isBuy = signal.side === "buy";
      const buffer = entry * 0.0001;
      const tps = Array.isArray(signal.tps) ? ([...signal.tps] as TpRow[]) : [];

      if (sl != null) {
        const slHit = isBuy ? price <= sl - buffer : price >= sl + buffer;
        if (slHit) {
          const key = `${signal.id}:sl`;
          if (shouldFire(key)) {
            const pips = Math.abs(calculatePipsFromPrice(entry, sl, signal.symbol));
            void markSlHit(signal.id, Number(pips.toFixed(2)));
          }
          continue;
        }
      }

      const inProfit = isBuy ? price > entry : price < entry;
      if (!inProfit) continue;

      for (let i = 0; i < tps.length; i++) {
        const tp = tps[i];
        if (tp.hit) continue;
        if (i > 0 && !tps[i - 1]?.hit) continue;

        const validTp = isBuy ? tp.price > entry : tp.price < entry;
        if (!validTp) continue;

        const hit = isBuy ? price >= tp.price - buffer : price <= tp.price + buffer;
        if (!hit) continue;

        const key = `${signal.id}:tp:${i}`;
        if (shouldFire(key)) {
          void markTpHit(signal.id, i);
        }
      }
    }
  }, [prices, signals, roomId, enabled, markTpHit, markSlHit]);
}
