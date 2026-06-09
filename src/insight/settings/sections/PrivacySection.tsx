import { Eye, Lock, MessageSquareOff, ShieldOff } from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function PrivacySection() {
  return (
    <div className="space-y-6">
      <SettingsCardGroup caption="Visibility">
        <SettingsRow icon={Eye} label="Last seen & online" value="Everyone" />
        <SettingsRow icon={Lock} label="Profile visibility" value="Members" />
        <SettingsRow
          icon={MessageSquareOff}
          label="Who can DM you"
          value="Following"
        />
        <SettingsRow icon={ShieldOff} label="Blocked users" value="0" />
      </SettingsCardGroup>

      <ComingSoonCard
        title="Privacy controls"
        description="Granular controls for who can see your activity and contact you. Backed by your Supabase profile and room membership rules."
      />
    </div>
  );
}
