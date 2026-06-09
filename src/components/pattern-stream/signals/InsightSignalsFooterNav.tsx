import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Filter, TrendingDown, TrendingUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SignalStreamFooterNav } from "@/components/signals/SignalStreamFooterNav";
import { MobileFilterSheet } from "@/components/signals/MobileFilterSheet";
import { ProviderNotificationSettingsModal } from "@/components/notifications/ProviderNotificationSettingsModal";
import { SignalUpdateActivityCard } from "@/components/pattern-stream/signals/SignalUpdateActivityCard";
import { useRoomMembers } from "@/hooks/pattern-stream/useRoomMembers";
import { supabase } from "@/integrations/supabase/client";
import type { RoomSignal } from "@/hooks/pattern-stream/types";
import {
  DEFAULT_INSIGHT_SIGNAL_FOOTER_FILTERS,
  type InsightSignalsFooterFilters,
} from "@/utils/filterRoomSignals";

interface InsightSignalsFooterNavProps {
  roomId: string | undefined;
  signals: RoomSignal[];
  filters: InsightSignalsFooterFilters;
  onFiltersChange: (filters: InsightSignalsFooterFilters) => void;
  canCreateSignals: boolean;
  onCreateAlert: () => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status", icon: Filter },
  { value: "active", label: "Active", icon: Clock },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "closed", label: "Closed", icon: Filter },
];

const TRADE_TYPE_OPTIONS = [
  { value: "all", label: "All Types", icon: Filter },
  { value: "buy", label: "Buy Orders", icon: TrendingUp },
  { value: "sell", label: "Sell Orders", icon: TrendingDown },
];

export function InsightSignalsFooterNav({
  roomId,
  signals,
  filters,
  onFiltersChange,
  canCreateSignals,
  onCreateAlert,
}: InsightSignalsFooterNavProps) {
  const { members } = useRoomMembers(roomId);

  const [filterSheetType, setFilterSheetType] = useState<"status" | "tradeType" | "educator" | null>(
    null,
  );
  const [recentOpen, setRecentOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const providerOptions = useMemo(() => {
    const providers = members.filter(
      (m) => m.role === "owner" || m.role === "provider" || m.role === "admin",
    );
    return providers.map((m) => ({
      id: m.user_id,
      name: m.profile?.display_name ?? "Provider",
    }));
  }, [members]);

  const providerNames = useMemo(() => {
    const map: Record<string, string> = {};
    providerOptions.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [providerOptions]);

  const signalsById = useMemo(() => {
    const map: Record<string, RoomSignal> = {};
    signals.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [signals]);

  const { data: recentUpdates = [], isLoading: recentLoading } = useQuery({
    enabled: recentOpen && !!roomId && signals.length > 0,
    queryKey: ["pattern-stream", "recent-signal-updates", roomId, signals.length],
    queryFn: async () => {
      const signalIds = signals.map((s) => s.id);
      const { data, error } = await supabase
        .from("room_signal_updates")
        .select("id, signal_id, type, value, created_at")
        .in("signal_id", signalIds)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });

  const openFilterSheet = (type: "status" | "tradeType" | "educator") => {
    setFilterSheetType(type);
  };

  const filterValueForSheet = () => {
    if (filterSheetType === "status") return filters.status;
    if (filterSheetType === "tradeType") return filters.tradeType;
    return filters.educator;
  };

  const handleFilterValueChange = (value: string) => {
    if (filterSheetType === "status") {
      onFiltersChange({ ...filters, status: value });
    } else if (filterSheetType === "tradeType") {
      onFiltersChange({ ...filters, tradeType: value });
    } else if (filterSheetType === "educator") {
      onFiltersChange({ ...filters, educator: value });
    }
  };

  return (
    <>
      <SignalStreamFooterNav
        filters={filters}
        onFiltersChange={onFiltersChange}
        onOpenFilter={() => openFilterSheet("status")}
        onOpenRecent={() => setRecentOpen(true)}
        onOpenNotifications={() => setNotifOpen(true)}
        onCreateAlert={onCreateAlert}
        educatorOptions={providerOptions}
        canCreateSignals={canCreateSignals}
        forceVisible
      />

      {filterSheetType && (
        <MobileFilterSheet
          type={filterSheetType}
          isOpen
          onClose={() => setFilterSheetType(null)}
          currentValue={filterValueForSheet()}
          onValueChange={handleFilterValueChange}
          options={
            filterSheetType === "status"
              ? STATUS_OPTIONS
              : filterSheetType === "tradeType"
                ? TRADE_TYPE_OPTIONS
                : []
          }
          educatorOptions={providerOptions}
          selectedEducators={filters.selectedEducators}
          onEducatorsChange={(ids) =>
            onFiltersChange({ ...filters, selectedEducators: ids, educator: "all" })
          }
          filters={filters}
          statusOptions={STATUS_OPTIONS}
          tradeTypeOptions={TRADE_TYPE_OPTIONS}
          canCreateSignals={canCreateSignals}
          onCreateSignal={() => {
            setFilterSheetType(null);
            onCreateAlert();
          }}
          onOpenFilterSheet={openFilterSheet}
          onOpenNotificationSheet={() => {
            setFilterSheetType(null);
            setRecentOpen(true);
          }}
          onOpenNotificationSettings={() => {
            setFilterSheetType(null);
            setNotifOpen(true);
          }}
        />
      )}

      <Sheet open={recentOpen} onOpenChange={setRecentOpen}>
        <SheetContent side="bottom-mobile" className="max-h-[70vh] rounded-t-2xl border-border/50 p-0">
          <SheetHeader className="px-4 pt-4 pb-2 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Recent signal activity
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[55vh] overflow-y-auto px-4 pb-safe">
            {recentLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading activity…</p>
            ) : recentUpdates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              <ul className="space-y-3 pb-4">
                {recentUpdates.map((update) => {
                  const signal = signalsById[update.signal_id];
                  return (
                    <li key={update.id}>
                      <SignalUpdateActivityCard
                        updateType={update.type}
                        value={update.value}
                        signal={signal}
                        providerName={
                          signal ? providerNames[signal.provider_id] : undefined
                        }
                        createdAt={update.created_at}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ProviderNotificationSettingsModal
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        educatorOptions={providerOptions}
        filters={filters}
        onFiltersChange={onFiltersChange}
        statusOptions={STATUS_OPTIONS}
        tradeTypeOptions={TRADE_TYPE_OPTIONS}
        canCreateSignals={canCreateSignals}
        onCreateSignal={() => {
          setNotifOpen(false);
          onCreateAlert();
        }}
        onOpenFilterSheet={openFilterSheet}
      />
    </>
  );
}

export { DEFAULT_INSIGHT_SIGNAL_FOOTER_FILTERS };
