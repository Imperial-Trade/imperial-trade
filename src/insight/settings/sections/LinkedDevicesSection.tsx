import { Laptop, QrCode } from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function LinkedDevicesSection() {
  return (
    <div className="space-y-6">
      <SettingsCardGroup>
        <SettingsRow
          icon={QrCode}
          label="Link a device"
          description="Use the camera on your other device to scan a code"
        />
      </SettingsCardGroup>

      <ComingSoonCard
        title="No linked devices"
        description="When you sign in on the web or another phone, sessions appear here. You can sign them out at any time."
      />

      <SettingsCardGroup caption="This device">
        <SettingsRow icon={Laptop} label="Web · this browser" value="Active now" hideChevron />
      </SettingsCardGroup>
    </div>
  );
}
