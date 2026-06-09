import { useCallback, useMemo, useRef } from "react";
import TradeAlertCard from "@/components/signals/TradeAlertCard";
import { useOptimizedWebSocketPrices } from "@/contexts/OptimizedWebSocketPriceContext";
import { useSignalActions } from "@/hooks/pattern-stream/useSignalActions";
import type { RoomSignal } from "@/hooks/pattern-stream/types";
import type { TradeAlertData } from "@/types/components";
import { roomSignalToTradeAlertData } from "@/utils/roomSignalToTradeAlertData";
import { calculatePipsFromPrice } from "@/utils/pipCalculations";
import { toast } from "@/hooks/use-toast";

interface RoomTradeAlertCardProps {
  signal: RoomSignal;
  roomId: string | undefined;
  /** Room owner/provider may automate TP/SL and close (same as Signal Stream creator). */
  canManage: boolean;
  brandName?: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
  isProvider?: boolean;
  className?: string;
  /** Insight chat density — matches `max-w-[85%]` message clusters. */
  compact?: boolean;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function RoomTradeAlertCard({
  signal,
  roomId,
  canManage,
  brandName,
  authorName,
  authorAvatarUrl,
  isProvider,
  className,
  compact = false,
}: RoomTradeAlertCardProps) {
  const alert = useMemo(() => roomSignalToTradeAlertData(signal), [signal]);
  const { prices, connectionStatus, dataSource } = useOptimizedWebSocketPrices();
  const { markTpHit, markSlHit, closeWin, updateNotes } = useSignalActions(roomId);
  const updateInProgressRef = useRef(new Set<string>());

  const livePrice = useMemo(() => {
    const row = prices[normalizeSymbol(signal.symbol)];
    const p = row?.price ?? row?.mid;
    return typeof p === "number" && Number.isFinite(p) ? p : undefined;
  }, [prices, signal.symbol]);

  const creator = useMemo(
    () => ({
      id: signal.provider_id,
      display_name: brandName ?? authorName ?? "Provider",
      role: isProvider ? "admin" : "provider",
      avatar_url: authorAvatarUrl ?? undefined,
    }),
    [signal.provider_id, brandName, authorName, authorAvatarUrl, isProvider],
  );

  const priceConnectionStatus =
    connectionStatus === "disconnected" ? "error" : connectionStatus;

  const resolvePipsAtPrice = useCallback(
    (price: number | undefined) => {
      const entry = Number(signal.entry);
      const sym = signal.symbol;
      const px =
        price ??
        livePrice ??
        (() => {
          const row = prices[normalizeSymbol(sym)];
          const v = row?.price ?? row?.mid;
          return typeof v === "number" ? v : null;
        })();
      if (px == null) return Math.abs(Number(signal.pips ?? 0));
      return Math.abs(Number(calculatePipsFromPrice(entry, px, sym).toFixed(2)));
    },
    [signal.entry, signal.symbol, signal.pips, livePrice, prices],
  );

  const withLock = useCallback(
    async (fn: () => Promise<void>) => {
      if (updateInProgressRef.current.has(signal.id)) return;
      updateInProgressRef.current.add(signal.id);
      try {
        await fn();
      } finally {
        updateInProgressRef.current.delete(signal.id);
      }
    },
    [signal.id],
  );

  const handleTakeProfitHit = useCallback(
    async (
      _alert: TradeAlertData,
      newTPHits: number[],
      shouldAutoClose = false,
      _closeReason: string | null = null,
    ) => {
      if (!canManage) return;
      await withLock(async () => {
        const tps = Array.isArray(signal.tps)
          ? (signal.tps as Array<{ price: number; hit?: boolean }>)
          : [];
        const currentHits = tps
          .map((tp, i) => (tp.hit ? i + 1 : null))
          .filter((n): n is number => n != null);

        for (const level of newTPHits) {
          const idx = level - 1;
          if (idx < 0 || idx >= tps.length) continue;
          if (!currentHits.includes(level)) {
            await markTpHit(signal.id, idx);
          }
        }

        if (shouldAutoClose) {
          await closeWin(signal.id, resolvePipsAtPrice(livePrice));
        }
      });
    },
    [canManage, withLock, signal, markTpHit, closeWin, livePrice, resolvePipsAtPrice],
  );

  const handleStopLossHit = useCallback(
    async (_alert: TradeAlertData, _closeReason: string) => {
      if (!canManage) return;
      const entry = Number(signal.entry);
      const sl = signal.sl != null ? Number(signal.sl) : entry;
      const pips = Math.abs(calculatePipsFromPrice(entry, sl, signal.symbol));
      await withLock(async () => {
        await markSlHit(signal.id, Number(pips.toFixed(2)));
      });
    },
    [canManage, withLock, signal, markSlHit],
  );

  const handleOrderActivation = useCallback(async () => {
    /* Room signals are created active; no pending activation flow. */
  }, []);

  const handleStatusUpdate = useCallback(async () => {
    /* Realtime + query invalidation refresh the card. */
  }, []);

  const handleCloseWithReason = useCallback(
    async (reason: string) => {
      if (!canManage) return;
      await withLock(async () => {
        await updateNotes(signal.id, reason);
        await closeWin(signal.id, resolvePipsAtPrice(livePrice));
        window.dispatchEvent(
          new CustomEvent("signal-closed-confirmed", {
            detail: {
              signalId: signal.id,
              assetName: alert.asset_name,
              closeReason: "manual",
              status: "closed",
            },
          }),
        );
        toast({
          title: "Signal closed",
          description: `${alert.asset_name} has been closed.`,
        });
      });
    },
    [canManage, withLock, signal.id, updateNotes, closeWin, resolvePipsAtPrice, livePrice, alert.asset_name],
  );

  const handleNotesSave = useCallback(
    async (notes: string) => {
      if (!canManage) return;
      await updateNotes(signal.id, notes);
    },
    [canManage, signal.id, updateNotes],
  );

  const isRecentClosure =
    signal.status === "closed_win" ||
    signal.status === "closed_loss" ||
    signal.status === "canceled";

  return (
    <TradeAlertCard
      alert={alert}
      creator={creator}
      onStatusUpdate={handleStatusUpdate}
      onTakeProfitHit={handleTakeProfitHit}
      onStopLossHit={handleStopLossHit}
      onOrderActivation={handleOrderActivation}
      onCloseWithReason={canManage ? handleCloseWithReason : undefined}
      onNotesSave={canManage ? handleNotesSave : undefined}
      isAdmin={false}
      isCreator={canManage}
      livePrice={livePrice}
      connectionStatus={priceConnectionStatus as "connecting" | "connected" | "error" | "polling"}
      priceSource={dataSource || "WebSocket"}
      isRecentClosure={isRecentClosure}
      compact={compact}
      className={className}
    />
  );
}
