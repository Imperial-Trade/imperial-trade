import { Book, MessageSquare, Send } from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function HelpSection() {
  return (
    <div className="space-y-6">
      <SettingsCardGroup caption="Get help">
        <SettingsRow
          icon={Book}
          label="Help center"
          description="Articles & guides"
        />
        <SettingsRow
          icon={MessageSquare}
          label="Contact support"
          description="help@imperial.trade"
        />
        <SettingsRow
          icon={Send}
          label="Send feedback"
          description="Tell us what would make Insight perfect"
        />
      </SettingsCardGroup>

      <ComingSoonCard
        title="In-app support"
        description="Live chat with support, community Q&A, and rich feedback flows are on the way."
      />
    </div>
  );
}
