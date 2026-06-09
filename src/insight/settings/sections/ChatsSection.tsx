import { Archive, Image, MessageSquare, Smile, Type } from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function ChatsSection() {
  return (
    <div className="space-y-6">
      <SettingsCardGroup caption="Display">
        <SettingsRow icon={Type} label="Font size" value="Default" />
        <SettingsRow icon={Image} label="Wallpaper" value="None" />
        <SettingsRow icon={Smile} label="Default reaction" value="👍" />
      </SettingsCardGroup>

      <SettingsCardGroup caption="Behavior">
        <SettingsRow
          icon={Archive}
          label="Archive old chats"
          value="Off"
        />
        <SettingsRow
          icon={MessageSquare}
          label="Read receipts"
          value="On"
        />
      </SettingsCardGroup>

      <ComingSoonCard
        title="Chat preferences"
        description="Customize the look and behavior of your room chats."
      />
    </div>
  );
}
