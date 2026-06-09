import {
  BadgeCheck,
  Briefcase,
  CircleDollarSign,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function ProviderSection() {
  return (
    <div className="space-y-6">
      <SettingsCardGroup caption="Provider tools">
        <SettingsRow
          icon={Briefcase}
          label="Provider Console"
          description="Manage rooms, members, and broadcasts"
          to="/dashboard/pattern-stream/console"
        />
        <SettingsRow
          icon={CircleDollarSign}
          label="Payouts"
          description="Stripe Connect status & schedule"
          to="/dashboard/pattern-stream/console/payouts"
        />
        <SettingsRow
          icon={PlusCircle}
          label="Create a room"
          to="/dashboard/pattern-stream/console/create"
        />
        <SettingsRow
          icon={BadgeCheck}
          label="Verified provider badge"
          value="Apply"
        />
      </SettingsCardGroup>

      <ComingSoonCard
        title="Performance widget"
        description="Show a verified track record on your room cards. Coming with public stats opt-in."
      />

      <SettingsCardGroup caption="Resources">
        <SettingsRow
          icon={ExternalLink}
          label="Provider playbook"
          to="/dashboard/insight/classroom"
        />
      </SettingsCardGroup>
    </div>
  );
}
