import { FileText, Info, MessageCircle, ShieldCheck } from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';

const APP_NAME = 'Imperial Insight';
const APP_VERSION = '1.0.0';

export function AboutSection() {
  return (
    <div className="space-y-6">
      <SettingsCardGroup>
        <SettingsRow icon={Info} label={APP_NAME} value={APP_VERSION} hideChevron />
      </SettingsCardGroup>

      <SettingsCardGroup caption="Legal">
        <SettingsRow icon={FileText} label="Terms of service" to="/legal/terms" />
        <SettingsRow icon={ShieldCheck} label="Privacy policy" to="/legal/privacy" />
      </SettingsCardGroup>

      <SettingsCardGroup caption="Support">
        <SettingsRow
          icon={MessageCircle}
          label="Contact support"
          description="help@imperial.trade"
        />
      </SettingsCardGroup>
    </div>
  );
}
