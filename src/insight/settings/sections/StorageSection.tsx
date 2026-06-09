import { Database, Download, HardDrive, Trash2 } from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function StorageSection() {
  return (
    <div className="space-y-6">
      <SettingsCardGroup caption="Storage">
        <SettingsRow icon={HardDrive} label="Cache size" value="0 MB" hideChevron />
        <SettingsRow icon={Trash2} label="Clear cache" />
      </SettingsCardGroup>

      <SettingsCardGroup caption="Data">
        <SettingsRow icon={Download} label="Media auto-download" value="Wi-Fi" />
        <SettingsRow icon={Database} label="Export your data" />
      </SettingsCardGroup>

      <ComingSoonCard
        title="Storage controls"
        description="See per-room media usage, set auto-download rules by network, and export your account data."
      />
    </div>
  );
}
