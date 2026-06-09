import type { ComponentType } from 'react';
import {
  ArrowDownUp,
  BadgeCheck,
  Bell,
  Bookmark,
  GraduationCap,
  HelpCircle,
  Info,
  KeyRound,
  Laptop,
  ListOrdered,
  Lock,
  Megaphone,
  MessageSquare,
  Palette,
  Receipt,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { AccountSection } from '@/insight/settings/sections/AccountSection';
import { AppearanceSection } from '@/insight/settings/sections/AppearanceSection';
import { NotificationsSection } from '@/insight/settings/sections/NotificationsSection';
import { SubscriptionsSection } from '@/insight/settings/sections/SubscriptionsSection';
import { ProviderSection } from '@/insight/settings/sections/ProviderSection';
import { AboutSection } from '@/insight/settings/sections/AboutSection';
import { PrivacySection } from '@/insight/settings/sections/PrivacySection';
import { ChatsSection } from '@/insight/settings/sections/ChatsSection';
import { StorageSection } from '@/insight/settings/sections/StorageSection';
import { LinkedDevicesSection } from '@/insight/settings/sections/LinkedDevicesSection';
import { StarredSection } from '@/insight/settings/sections/StarredSection';
import { ListsSection } from '@/insight/settings/sections/ListsSection';
import { BroadcastsSection } from '@/insight/settings/sections/BroadcastsSection';
import { HelpSection } from '@/insight/settings/sections/HelpSection';
import { InviteSection } from '@/insight/settings/sections/InviteSection';

export type InsightSettingsGroupId = 'tools' | 'account' | 'trading' | 'help';

export interface InsightSettingsSection {
  /** URL segment used in `/dashboard/insight/settings/<segment>`. */
  segment: string;
  /** Title rendered on detail pages and in the rail. */
  label: string;
  /** Optional one-line description used by some places (kept short). */
  description?: string;
  /** Lucide icon shown in the row leading slot. */
  icon: LucideIcon;
  /** Detail page component. */
  component: ComponentType;
  /** Group id to organize the WhatsApp-style card groups. */
  group: InsightSettingsGroupId;
  /** When true, render as an external/deep-link row that does NOT mount a detail page. */
  externalTo?: string;
}

/**
 * Central registry of Insight settings sections — one source of truth for the row list,
 * detail page mounting, and titles. Order in this array also determines display order.
 */
export const INSIGHT_SETTINGS_SECTIONS: InsightSettingsSection[] = [
  /** Group A — communication tools (WhatsApp top group, retargeted to trading-social). */
  {
    segment: 'lists',
    label: 'Lists',
    description: 'Custom watchlists and room collections',
    icon: ListOrdered,
    component: ListsSection,
    group: 'tools',
  },
  {
    segment: 'starred',
    label: 'Starred signals',
    description: 'Saved messages and signals',
    icon: Bookmark,
    component: StarredSection,
    group: 'tools',
  },
  {
    segment: 'broadcasts',
    label: 'Broadcasts',
    description: 'One-to-many announcements from providers',
    icon: Megaphone,
    component: BroadcastsSection,
    group: 'tools',
  },
  {
    segment: 'linked-devices',
    label: 'Linked devices',
    description: 'Manage active sessions',
    icon: Laptop,
    component: LinkedDevicesSection,
    group: 'tools',
  },

  /** Group B — account & app (matches WhatsApp middle group). */
  {
    segment: 'account',
    label: 'Account',
    description: 'Email, password, language, sign out',
    icon: KeyRound,
    component: AccountSection,
    group: 'account',
  },
  {
    segment: 'privacy',
    label: 'Privacy',
    description: 'Who can DM you, presence, blocked users',
    icon: Lock,
    component: PrivacySection,
    group: 'account',
  },
  {
    segment: 'chats',
    label: 'Chats',
    description: 'Wallpaper, font size, defaults',
    icon: MessageSquare,
    component: ChatsSection,
    group: 'account',
  },
  {
    segment: 'notifications',
    label: 'Notifications',
    description: 'Push, signals, mentions, DMs',
    icon: Bell,
    component: NotificationsSection,
    group: 'account',
  },
  {
    segment: 'storage',
    label: 'Storage and data',
    description: 'Cache, media auto-download, exports',
    icon: ArrowDownUp,
    component: StorageSection,
    group: 'account',
  },

  /** Group C — trading + provider (Insight-specific). */
  {
    segment: 'subscriptions',
    label: 'Subscriptions',
    description: 'Paid rooms, renewals, invoices',
    icon: Receipt,
    component: SubscriptionsSection,
    group: 'trading',
  },
  {
    segment: 'provider',
    label: 'Provider tools',
    description: 'Stripe Connect, payouts, owned rooms',
    icon: BadgeCheck,
    component: ProviderSection,
    group: 'trading',
  },
  {
    segment: 'appearance',
    label: 'Appearance',
    description: 'Theme, density, motion',
    icon: Palette,
    component: AppearanceSection,
    group: 'trading',
  },
  {
    segment: 'classroom',
    label: 'Classroom',
    description: 'Video lessons & courses',
    icon: GraduationCap,
    component: () => null,
    group: 'trading',
    externalTo: '/dashboard/insight/classroom',
  },

  /** Group D — footer (help / invite / about). */
  {
    segment: 'help',
    label: 'Help and feedback',
    description: 'Articles, contact support, send feedback',
    icon: HelpCircle,
    component: HelpSection,
    group: 'help',
  },
  {
    segment: 'invite',
    label: 'Invite a friend',
    description: 'Share Insight with another trader',
    icon: UserPlus,
    component: InviteSection,
    group: 'help',
  },
  {
    segment: 'about',
    label: 'About',
    description: 'Version, terms, privacy',
    icon: Info,
    component: AboutSection,
    group: 'help',
  },
];

export function findSection(segment: string | undefined | null) {
  if (!segment) return undefined;
  return INSIGHT_SETTINGS_SECTIONS.find((s) => s.segment === segment);
}

/** Group sections in display order, returning a list of [groupId, sections[]] tuples. */
export function groupedSections(): [
  InsightSettingsGroupId,
  InsightSettingsSection[],
][] {
  const buckets: Record<InsightSettingsGroupId, InsightSettingsSection[]> = {
    tools: [],
    account: [],
    trading: [],
    help: [],
  };
  for (const s of INSIGHT_SETTINGS_SECTIONS) {
    buckets[s.group].push(s);
  }
  return [
    ['tools', buckets.tools],
    ['account', buckets.account],
    ['trading', buckets.trading],
    ['help', buckets.help],
  ];
}
