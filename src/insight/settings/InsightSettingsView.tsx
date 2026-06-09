import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useInsightSurface } from '@/insight/useInsightSurface';
import { SettingsCardGroup } from '@/insight/settings/SettingsCardGroup';
import { SettingsRow } from '@/insight/settings/SettingsRow';
import { SettingsHero } from '@/insight/settings/SettingsHero';
import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';
import {
  INSIGHT_SETTINGS_SECTIONS,
  findSection,
  groupedSections,
} from '@/insight/settings/settingsRegistry';
import { INSIGHT_FOCUS_RING } from '@/insight/insightCardTokens';

const SETTINGS_BASE = '/dashboard/insight/settings';

function readActiveSegment(pathname: string) {
  /** strip optional trailing slash */
  const trimmed = pathname.replace(/\/$/, '');
  if (trimmed === SETTINGS_BASE) return null;
  if (!trimmed.startsWith(`${SETTINGS_BASE}/`)) return null;
  return trimmed.slice(SETTINGS_BASE.length + 1).split('/')[0] ?? null;
}

interface SignOutRowProps {
  className?: string;
}

function SignOutRow({ className }: SignOutRowProps) {
  const { signOut } = useAuth();
  return (
    <SettingsCardGroup className={className}>
      <SettingsRow
        icon={LogOut}
        label="Sign out"
        destructive
        hideChevron
        onClick={() => {
          void signOut();
        }}
      />
    </SettingsCardGroup>
  );
}

interface IndexContentProps {
  /** When true, omit the hero and render only the row groups (rail variant on desktop). */
  compactRail?: boolean;
  /** When provided, mark the matching section row as selected (rail variant). */
  activeSegment?: string | null;
}

/** Hero + grouped row list — mirrors the WhatsApp settings screenshot. */
function IndexContent({ compactRail, activeSegment }: IndexContentProps) {
  const groups = useMemo(() => groupedSections(), []);

  return (
    <div className="flex w-full flex-col gap-6 px-3 pt-3 sm:px-4">
      {compactRail ? (
        <SettingsHero compact />
      ) : (
        <SettingsHero />
      )}

      {groups.map(([groupId, sections]) => {
        if (sections.length === 0) return null;
        return (
          <SettingsCardGroup
            key={groupId}
            caption={groupId === 'tools' ? 'Settings' : undefined}
          >
            {sections.map((s) => {
              const isActive = activeSegment === s.segment;
              return (
                <SettingsRow
                  key={s.segment}
                  icon={s.icon}
                  label={s.label}
                  description={compactRail ? undefined : s.description}
                  to={
                    s.externalTo
                      ? s.externalTo
                      : `${SETTINGS_BASE}/${s.segment}`
                  }
                  className={cn(
                    isActive
                      ? 'bg-muted/40 ring-1 ring-border/60'
                      : undefined,
                  )}
                />
              );
            })}
          </SettingsCardGroup>
        );
      })}

      <SignOutRow />
    </div>
  );
}

interface DetailContentProps {
  segment: string;
  /** Show a small surrounding container suitable for the right pane on desktop. */
  insidePane?: boolean;
}

function DetailContent({ segment, insidePane }: DetailContentProps) {
  const section = findSection(segment);
  if (!section || section.externalTo) {
    return (
      <div className={cn(insidePane ? '' : 'px-3 pt-3 sm:px-4')}>
        <ComingSoonCard
          title="Section not found"
          description="This settings section doesn't exist yet. Pick another from the menu."
        />
      </div>
    );
  }
  const Component = section.component;
  return (
    <div className={cn(insidePane ? '' : 'px-3 pt-3 sm:px-4')}>
      <Component />
    </div>
  );
}

interface InsightSettingsViewProps {
  /** Override the segment; otherwise read from `useLocation`. */
  segment?: string | null;
}

/**
 * Top-level Settings content. Single-pane on phone/tablet; master/detail on desktop.
 * The owning page (`InsightPage`) provides the `FeedComposerStrip` header.
 */
export function InsightSettingsView({
  segment: explicitSegment,
}: InsightSettingsViewProps = {}) {
  const location = useLocation();
  const surface = useInsightSurface();
  const segment =
    explicitSegment !== undefined
      ? explicitSegment
      : readActiveSegment(location.pathname);

  const isDesktop = surface === 'desktop';

  if (isDesktop) {
    return (
      <div className="flex w-full min-h-0 flex-1 gap-6 px-3 pt-3 sm:px-4">
        <aside className="w-[320px] shrink-0">
          <IndexContent compactRail activeSegment={segment} />
        </aside>
        <section
          className="min-w-0 flex-1"
          aria-live="polite"
        >
          {segment ? (
            <DetailContent segment={segment} insidePane />
          ) : (
            <div className="flex min-h-[40vh] items-center justify-center">
              <ComingSoonCard
                title="Pick a section"
                description="Choose a settings category on the left to view or change its options."
                className="w-full max-w-md"
              />
            </div>
          )}
        </section>
      </div>
    );
  }

  /** Phone / tablet: full-screen index OR full-screen detail (back arrow handled by header). */
  if (segment) {
    return <DetailContent segment={segment} />;
  }
  return <IndexContent />;
}

/** Returns the section for a given pathname (used by the page header to title detail pages). */
export function findSectionByPathname(pathname: string) {
  const segment = readActiveSegment(pathname);
  if (!segment) return undefined;
  return findSection(segment);
}

/** Internal helper exposed for the bottom-nav match logic and tests. */
export const _SETTINGS_BASE_FOR_TESTING = SETTINGS_BASE;
export { INSIGHT_SETTINGS_SECTIONS };
