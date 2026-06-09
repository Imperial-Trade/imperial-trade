import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { useSafeTheme } from '@/contexts/SafeThemeProvider';
import { cn } from '@/lib/utils';
import { INSIGHT_FOCUS_RING } from '@/insight/insightCardTokens';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
] as const;

export function AppearanceSection() {
  const { theme, setTheme } = useSafeTheme();

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          Theme
        </p>
        <div className="grid grid-cols-2 gap-2">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value as 'dark' | 'light')}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-2xl border px-4 py-4 text-left',
                  'transition-colors',
                  INSIGHT_FOCUS_RING,
                  active
                    ? 'border-border bg-muted/40'
                    : 'border-border/60 bg-card/40 hover:bg-muted/30',
                )}
                aria-pressed={active}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium text-foreground">
                    {opt.label}
                  </span>
                </span>
                {active ? (
                  <Check
                    className="h-4 w-4 shrink-0 text-foreground"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <SettingsCardGroup caption="Display">
        <SettingsRow
          icon={Palette}
          label="Density"
          value="Comfortable"
        />
        <SettingsRow
          icon={Monitor}
          label="Reduced motion"
          value="System"
        />
      </SettingsCardGroup>
    </div>
  );
}
