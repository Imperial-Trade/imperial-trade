import type { RoomSignal } from "@/hooks/pattern-stream/types";
import type { SignalsFilter } from "@/hooks/pattern-stream/useRoomSignals";

export interface InsightSignalsFooterFilters {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
  selectedEducators: string[];
}

export const DEFAULT_INSIGHT_SIGNAL_FOOTER_FILTERS: InsightSignalsFooterFilters = {
  search: "",
  status: "all",
  tradeType: "all",
  educator: "all",
  selectedEducators: [],
};

export function tabFilterToFooterStatus(tab: SignalsFilter): string {
  if (tab === "closed") return "closed";
  return tab;
}

export function footerStatusToTabFilter(status: string): SignalsFilter {
  if (status === "active" || status === "pending" || status === "closed") return status;
  return "all";
}

function matchesStatus(signal: RoomSignal, status: string): boolean {
  if (!status || status === "all") return true;
  if (status === "active") return signal.status === "active";
  if (status === "pending") return signal.status === "pending";
  if (status === "closed") {
    return (
      signal.status === "closed_win" ||
      signal.status === "closed_loss" ||
      signal.status === "canceled"
    );
  }
  return true;
}

function matchesTradeType(signal: RoomSignal, tradeType: string): boolean {
  if (!tradeType || tradeType === "all") return true;
  return signal.side === tradeType;
}

function matchesProvider(
  signal: RoomSignal,
  educator: string,
  selectedEducators: string[],
): boolean {
  if (selectedEducators.length > 0) {
    return selectedEducators.includes(signal.provider_id);
  }
  if (!educator || educator === "all") return true;
  return signal.provider_id === educator;
}

/** Applies Signal Stream–style footer filters to room-scoped signals. */
export function applyInsightSignalFooterFilters(
  signals: RoomSignal[],
  filters: InsightSignalsFooterFilters,
  providerNames: Record<string, string>,
): RoomSignal[] {
  const q = filters.search.trim().toLowerCase();
  return signals.filter((signal) => {
    if (q) {
      const provider = providerNames[signal.provider_id] ?? "";
      const haystack = `${signal.symbol} ${signal.notes ?? ""} ${provider} ${signal.side}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (!matchesStatus(signal, filters.status)) return false;
    if (!matchesTradeType(signal, filters.tradeType)) return false;
    if (!matchesProvider(signal, filters.educator, filters.selectedEducators)) return false;
    return true;
  });
}
