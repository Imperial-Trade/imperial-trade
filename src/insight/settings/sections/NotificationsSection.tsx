import { useState } from 'react';
import { AtSign, Bell, MessageSquare, Send, Zap } from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { Switch } from '@/components/ui/switch';

interface ToggleRowProps {
  label: string;
  description?: string;
  defaultOn?: boolean;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

function ToggleRow({
  label,
  description,
  defaultOn = true,
  icon: Icon,
}: ToggleRowProps) {
  const [on, setOn] = useState(defaultOn);
  return (
    <SettingsRow
      icon={Icon as never}
      label={label}
      description={description}
      hideChevron
      trailing={
        <Switch
          checked={on}
          onCheckedChange={setOn}
          aria-label={label}
        />
      }
    />
  );
}

export function NotificationsSection() {
  return (
    <div className="space-y-6">
      <SettingsCardGroup caption="Push notifications">
        <ToggleRow
          icon={Bell}
          label="Allow push"
          description="Send alerts to this device"
          defaultOn
        />
      </SettingsCardGroup>

      <SettingsCardGroup caption="Categories">
        <ToggleRow
          icon={Zap}
          label="New signals"
          description="Provider posts a new signal in a joined room"
          defaultOn
        />
        <ToggleRow
          icon={AtSign}
          label="Mentions"
          description="Someone @mentions you in a room"
          defaultOn
        />
        <ToggleRow
          icon={MessageSquare}
          label="Direct messages"
          description="DMs from people you follow"
          defaultOn
        />
        <ToggleRow
          icon={Send}
          label="Broadcasts"
          description="Provider broadcasts to all members"
          defaultOn={false}
        />
      </SettingsCardGroup>
    </div>
  );
}
