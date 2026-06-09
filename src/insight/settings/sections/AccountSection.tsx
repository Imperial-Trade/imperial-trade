import {
  AtSign,
  Globe,
  KeyRound,
  Languages,
  LogOut,
  Trash2,
} from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { INSIGHT_FOCUS_RING } from '@/insight/insightCardTokens';

export function AccountSection() {
  const { user, signOut } = useAuth();
  const email = user?.email ?? 'Not signed in';
  const language = 'English';
  const timezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : '—';

  return (
    <div className="space-y-6">
      <SettingsCardGroup>
        <SettingsRow
          icon={AtSign}
          label="Email"
          value={email}
          hideChevron
        />
        <SettingsRow
          icon={KeyRound}
          label="Password"
          description="Reset via secure email link"
          to="/reset-password"
        />
      </SettingsCardGroup>

      <SettingsCardGroup>
        <SettingsRow
          icon={Languages}
          label="Language"
          value={language}
        />
        <SettingsRow
          icon={Globe}
          label="Time zone"
          value={timezone}
          hideChevron
        />
      </SettingsCardGroup>

      <SettingsCardGroup>
        <SettingsRow
          icon={LogOut}
          label="Sign out"
          destructive
          hideChevron
          onClick={() => {
            void signOut();
          }}
        />
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 px-4 py-4 text-left',
            'text-rose-500 transition-colors hover:bg-rose-500/10',
            INSIGHT_FOCUS_RING,
          )}
          onClick={() => {
            window.alert('Account deletion is handled by support — email help@imperial.trade');
          }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-500">
            <Trash2 className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-tight">
              Delete account
            </span>
            <span className="mt-0.5 block truncate text-xs text-rose-500/70">
              Permanently remove your account and data
            </span>
          </span>
        </button>
      </SettingsCardGroup>
    </div>
  );
}
