import { Copy, Share2 } from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function InviteSection() {
  const url =
    typeof window !== 'undefined' ? window.location.origin : 'https://imperial.trade';
  return (
    <div className="space-y-6">
      <SettingsCardGroup caption="Share">
        <SettingsRow
          icon={Share2}
          label="Share Insight"
          description="Invite traders to join Imperial Insight"
        />
        <SettingsRow
          icon={Copy}
          label="Copy invite link"
          value={url}
          onClick={() => {
            try {
              void navigator.clipboard?.writeText(url);
            } catch {
              /* noop */
            }
          }}
        />
      </SettingsCardGroup>

      <ComingSoonCard
        title="Referral rewards"
        description="Earn credits or discounts on paid rooms when traders sign up through your link."
      />
    </div>
  );
}
