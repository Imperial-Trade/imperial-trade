import { CreditCard, Receipt } from 'lucide-react';
import { useJoinedRoomList } from '@/hooks/pattern-stream/useJoinedRoomList';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';
import { cn } from '@/lib/utils';
import {
  INSIGHT_CARD_CLASS,
  insightChipBase,
  insightChipYellowGreen,
} from '@/insight/insightCardTokens';

export function SubscriptionsSection() {
  const { data, isLoading } = useJoinedRoomList();
  const paid = (data ?? []).filter((r) => r.monetization === 'paid');

  return (
    <div className="space-y-6">
      <SettingsCardGroup caption="Payment">
        <SettingsRow
          icon={CreditCard}
          label="Payment method"
          value="Add card"
        />
        <SettingsRow icon={Receipt} label="Invoices & receipts" />
      </SettingsCardGroup>

      <div>
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          Active subscriptions
        </p>
        {isLoading ? (
          <div className={cn(INSIGHT_CARD_CLASS, 'px-6 py-10 text-center')}>
            <p className="text-sm text-muted-foreground">Loading subscriptions…</p>
          </div>
        ) : paid.length === 0 ? (
          <ComingSoonCard
            title="No paid rooms yet"
            description="Subscriptions to paid rooms appear here with renewals and invoices."
          />
        ) : (
          <div className="space-y-2">
            {paid.map((r) => (
              <div
                key={r.id}
                className={cn(INSIGHT_CARD_CLASS, 'flex items-center gap-3')}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/60 text-sm font-semibold text-foreground ring-1 ring-border/60">
                  {r.avatar_url ? (
                    <img
                      src={r.avatar_url}
                      alt={r.name ?? 'Room'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{(r.name ?? 'R').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {r.name ?? 'Room'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Paid subscription
                  </p>
                </div>
                <span className={cn(insightChipBase, insightChipYellowGreen)}>
                  Active
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
