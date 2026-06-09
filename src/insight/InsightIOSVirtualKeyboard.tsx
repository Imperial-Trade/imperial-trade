import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Apple,
  Car,
  ChevronUp,
  Clock,
  ArrowUp,
  Check,
  CornerDownLeft,
  Delete,
  Dog,
  Flag,
  Heart,
  Lightbulb,
  Mic,
  Search,
  Smile,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INSIGHT_VK_MOTION,
  insightVirtualKeyboardSheetGlassClass,
} from '@/insight/orderflowChrome';
import {
  copyKeyboardSettingsInstructions,
  getKeyboardSettingsInstructions,
  openIOSAppSettings,
} from '@/insight/insightIOSKeyboardBridge';
import {
  getEmojisForCategory,
  searchEmojis,
  type EmojiCategoryId,
} from '@/insight/iosEmojiCategories';
import { getLetterAlternates } from '@/insight/iosLetterAlternates';
import {
  getRecentComposerEmojis,
  pushRecentComposerEmoji,
} from '@/utils/recentComposerEmojis';
import {
  alternateStripWidth,
  computeKeyboardPopoverLayout,
  stemPreviewWidth,
} from '@/insight/insightKeyboardPopoverLayout';
import {
  playInsightKeyClick,
  type InsightKeyClickVariant,
} from '@/utils/insightKeyboardClickSound';

const KEYBOARD_Z = 'z-[1260]';

function safeTrim(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/** Letter / symbol keys — translucent greys like iOS caps on the material */
const IOS_KEY_LETTER =
  'border border-white border-opacity-[0.10] bg-[rgba(120,120,128,0.52)] shadow-[0_1px_0_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[2px]';

const IOS_KEY_LETTER_PRESSED =
  'border border-white/20 bg-[rgba(255,255,255,0.55)] shadow-[0_1px_0_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-[2px] text-black';

/** Shift / 123 / ABC chrome keys */
const IOS_KEY_MODIFIER =
  'border border-white border-opacity-[0.08] bg-[rgba(88,88,92,0.58)] shadow-[0_1px_0_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[2px]';

const IOS_KEY_MODIFIER_PRESSED =
  'border border-white/16 bg-[rgba(140,140,148,0.72)] shadow-[0_1px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[2px] brightness-110';

const IOS_KEY_RETURN =
  'border border-[rgba(0,122,255,0.35)] bg-[rgba(0,122,255,0.92)] shadow-[0_1px_0_rgba(0,0,0,0.35)]';

const IOS_KEY_RETURN_PRESSED =
  'border border-[rgba(0,122,255,0.5)] bg-[rgba(0,122,255,1)] shadow-[0_1px_0_rgba(0,0,0,0.25)] brightness-110 scale-[0.96]';

/** Renders with Apple Color Emoji on iPhone; same codepoints as iOS keyboard order where possible. */
const IOS_EMOJI_FONT_FAMILY =
  '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji",system-ui,sans-serif';

/** ~42px rows — Telegram / compact iOS keyboard scale */
const KEY_ROW_H = 'h-[42px]';
const KEY_TEXT = 'text-[20px]';
const KEY_GAP = 'gap-[4px]';
const KEY_RADIUS = 'rounded-[5px]';
/** Letter layout: 4 rows + gaps + top pad — emoji panel matches this body height */
const KEYBOARD_BODY_H_PX = 42 * 4 + 4 * 3 + 2;

const ROW_QWERTY = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] as const;
const ROW_ASDF = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'] as const;
const ROW_ZXCV = ['z', 'x', 'c', 'v', 'b', 'n', 'm'] as const;

const NUM_ROW1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;
const NUM_ROW2 = ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'] as const;
const NUM_ROW3 = ['.', ',', '?', '!', "'"] as const;

const SYM_ROW1 = ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='] as const;
const SYM_ROW2 = ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'] as const;

type LayoutMode = 'letters' | 'numbers' | 'symbols' | 'emoji';

type StemPreview = {
  label: string;
  rect: DOMRect;
  kind?: 'letter' | 'emoji';
};

type AlternateMenu = {
  chars: string[];
  rect: DOMRect;
  selectedIndex: number;
};

const EMOJI_CATEGORY_TABS: {
  id: EmojiCategoryId;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}[] = [
  { id: 'recents', icon: Clock, label: 'Recents' },
  { id: 'smileys', icon: Smile, label: 'Smileys' },
  { id: 'animals', icon: Dog, label: 'Animals' },
  { id: 'food', icon: Apple, label: 'Food' },
  { id: 'activity', icon: Trophy, label: 'Activity' },
  { id: 'travel', icon: Car, label: 'Travel' },
  { id: 'objects', icon: Lightbulb, label: 'Objects' },
  { id: 'symbols', icon: Heart, label: 'Symbols' },
  { id: 'flags', icon: Flag, label: 'Flags' },
];

function getSpeechRecognitionCtor(): (new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => unknown;
    webkitSpeechRecognition?: new () => unknown;
  };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C as ReturnType<typeof getSpeechRecognitionCtor>;
}

function lightHaptic() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
  } catch {
    /* iOS often ignores vibrate */
  }
}

function keyFeedback(variant: InsightKeyClickVariant) {
  requestAnimationFrame(() => {
    lightHaptic();
    playInsightKeyClick(variant);
  });
}

function getKeyboardColumnRect(): DOMRect | null {
  if (typeof document === 'undefined') return null;
  const stack = document.querySelector('[data-insight-chat-input-stack]');
  return stack instanceof HTMLElement ? stack.getBoundingClientRect() : null;
}

/** Shared iOS light-gray popover body + stem rooted to key center. */
function IOSPopoverChrome({
  layout,
  stemOffsetX,
  reduceMotion,
  children,
  className,
  bodyClassName,
}: {
  layout: { left: number; top: number; width: number };
  stemOffsetX: number;
  reduceMotion: boolean | null;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const stemLeft = `calc(50% + ${stemOffsetX}px)`;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.05 }}
      className={cn('pointer-events-none fixed z-[1295]', className)}
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        transform: 'translateY(calc(-100% + 4px))',
      }}
      aria-hidden
    >
      <div className="relative w-full">
        <div
          className={cn(
            'w-full rounded-[11px] border border-black/10 bg-[#b8b8be] shadow-lg',
            bodyClassName,
          )}
        >
          {children}
        </div>
        <div
          className="absolute bottom-0 h-[11px] w-[22px] -translate-x-1/2 translate-y-[2px] bg-[#b8b8be]"
          style={{
            left: stemLeft,
            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
          }}
        />
      </div>
    </motion.div>
  );
}

function IOSKeyStemPreview({
  preview,
  reduceMotion,
}: {
  preview: StemPreview;
  reduceMotion: boolean | null;
}) {
  const { label, rect, kind = 'letter' } = preview;
  const isEmoji = kind === 'emoji';
  const width = stemPreviewWidth(rect, kind);
  const { left, top, stemOffsetX } = computeKeyboardPopoverLayout({
    keyRect: rect,
    popoverWidth: width,
    columnRect: getKeyboardColumnRect(),
  });

  return (
    <IOSPopoverChrome
      layout={{ left, top, width }}
      stemOffsetX={stemOffsetX}
      reduceMotion={reduceMotion}
      bodyClassName={cn(
        'flex items-start justify-center font-normal text-black',
        isEmoji
          ? 'min-h-[64px] pt-1.5 pb-0.5 text-[42px] leading-none'
          : 'min-h-[56px] pt-2 pb-1 text-[34px]',
      )}
    >
      <span
        style={
          isEmoji
            ? {
                fontFamily: IOS_EMOJI_FONT_FAMILY,
                fontVariantEmoji: 'emoji',
              }
            : undefined
        }
      >
        {label}
      </span>
    </IOSPopoverChrome>
  );
}

function IOSAlternateKeyStrip({
  menu,
  onSelectIndex,
  reduceMotion,
}: {
  menu: AlternateMenu;
  onSelectIndex: (index: number) => void;
  reduceMotion: boolean | null;
}) {
  const { chars, rect, selectedIndex } = menu;
  const width = alternateStripWidth(rect, chars.length);
  const { left, top, stemOffsetX } = computeKeyboardPopoverLayout({
    keyRect: rect,
    popoverWidth: width,
    columnRect: getKeyboardColumnRect(),
  });

  return (
    <IOSPopoverChrome
      layout={{ left, top, width }}
      stemOffsetX={stemOffsetX}
      reduceMotion={reduceMotion}
      className="z-[1290] pointer-events-auto"
      bodyClassName="flex gap-0.5 p-1"
    >
      <div
        className="flex w-full gap-0.5"
        role="listbox"
        aria-label="Alternate characters"
      >
        {chars.map((ch, idx) => (
          <div
            key={`${ch}-${idx}`}
            data-alt-char-index={idx}
            role="option"
            aria-selected={idx === selectedIndex}
            className={cn(
              'flex h-10 min-w-10 flex-1 items-center justify-center rounded-[8px] px-1.5 text-[22px]',
              idx === selectedIndex
                ? 'bg-[#007aff] text-white'
                : 'text-black',
            )}
            onPointerEnter={() => onSelectIndex(idx)}
          >
            {ch}
          </div>
        ))}
      </div>
    </IOSPopoverChrome>
  );
}

type KeyPreviewHandler = (
  label: string,
  rect: DOMRect,
  kind?: 'letter' | 'emoji',
) => void;

/** iOS-style emoji key — preview on press-in, insert on press-out. */
const EmojiKeyButton = React.memo(function EmojiKeyButton({
  emoji,
  onPick,
  onShowPreview,
  onHidePreview,
  className,
}: {
  emoji: string;
  onPick: (emoji: string) => void;
  onShowPreview: KeyPreviewHandler;
  onHidePreview: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const insertedOnUpRef = useRef(false);
  const [isPressed, setIsPressed] = useState(false);

  const release = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      setIsPressed(false);
      onHidePreview();
    },
    [onHidePreview],
  );

  return (
    <button
      ref={ref}
      type="button"
      tabIndex={-1}
      aria-label={`Emoji ${emoji}`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        insertedOnUpRef.current = false;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setIsPressed(true);
        onShowPreview(emoji, rect, 'emoji');
      }}
      onPointerUp={(e) => {
        release(e);
        if (!insertedOnUpRef.current) {
          insertedOnUpRef.current = true;
          onPick(emoji);
        }
      }}
      onPointerCancel={release}
      onClick={(e) => e.preventDefault()}
      className={cn(
        'relative flex items-center justify-center touch-manipulation [-webkit-tap-highlight-color:transparent]',
        isPressed && 'z-[2] scale-90',
        className,
      )}
      style={{
        fontFamily: IOS_EMOJI_FONT_FAMILY,
        fontVariantEmoji: 'emoji',
      }}
    >
      <span className="pointer-events-none">{emoji}</span>
    </button>
  );
});

/** Photo 1 — emoji grid with tappable search bar (no letter keys). */
function IOSEmojiKeyboardPanel({
  searchQuery: searchQueryProp,
  onActivateSearch,
  onPickEmoji,
  onBackspace,
  onRepeatStart,
  onRepeatClear,
  onShowPreview,
  onHidePreview,
}: {
  searchQuery?: string | null;
  onActivateSearch: () => void;
  onPickEmoji: (emoji: string) => void;
  onBackspace: () => void;
  onRepeatStart: (intervalId: number) => void;
  onRepeatClear: () => void;
  onShowPreview: KeyPreviewHandler;
  onHidePreview: () => void;
}) {
  const searchQuery =
    typeof searchQueryProp === 'string' ? searchQueryProp : '';
  const [category, setCategory] = useState<EmojiCategoryId>('smileys');
  const [recents, setRecents] = useState<string[]>(() => getRecentComposerEmojis());

  const displayEmojis = useMemo(() => {
    const q = safeTrim(searchQuery);
    if (q) return searchEmojis(q, recents);
    return getEmojisForCategory(category, recents);
  }, [searchQuery, category, recents]);

  const handlePick = useCallback(
    (emoji: string) => {
      keyFeedback('letter');
      pushRecentComposerEmoji(emoji);
      setRecents(getRecentComposerEmojis());
      onPickEmoji(emoji);
    },
    [onPickEmoji],
  );

  return (
    <div
      className="flex w-full min-h-0 flex-col px-1.5 pt-1"
      style={{ height: KEYBOARD_BODY_H_PX }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Search Emoji"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
        }}
        onPointerUp={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          lightHaptic();
          onActivateSearch();
        }}
        onClick={(e) => e.preventDefault()}
        className={cn(
          'mb-1 flex h-9 w-full shrink-0 items-center gap-2 rounded-full bg-[#2c2c2e] px-3',
          'text-left touch-manipulation [-webkit-tap-highlight-color:transparent]',
          'active:bg-[#3a3a3c]',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
        {safeTrim(searchQuery) ? (
          <span className="min-w-0 flex-1 truncate text-[15px] text-white">
            {searchQuery}
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-[15px] text-white/50">
            Search Emoji
          </span>
        )}
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="grid grid-cols-8 gap-x-0.5 gap-y-0.5 px-0.5 py-0.5">
          {displayEmojis.length > 0 ? (
            displayEmojis.map((emoji, idx) => (
              <EmojiKeyButton
                key={`${idx}-${emoji}`}
                emoji={emoji}
                onPick={handlePick}
                onShowPreview={onShowPreview}
                onHidePreview={onHidePreview}
                className="aspect-square rounded-md text-[28px] leading-none"
              />
            ))
          ) : (
            <p className="col-span-8 py-6 text-center text-[14px] text-white/45">
              No emoji found
            </p>
          )}
        </div>
      </div>

      <div className="mt-0.5 flex shrink-0 items-center gap-0.5 border-t border-white/10 px-0.5 pt-1">
        {EMOJI_CATEGORY_TABS.map(({ id, icon: Icon, label }) => {
          const active = !safeTrim(searchQuery) && category === id;
          return (
            <button
              key={id}
              type="button"
              tabIndex={-1}
              aria-label={label}
              aria-pressed={active}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
              }}
              onPointerUp={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                setCategory(id);
                lightHaptic();
              }}
              onClick={(e) => e.preventDefault()}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/85',
                active && 'bg-white/15',
              )}
            >
              <Icon className="h-[16px] w-[16px]" strokeWidth={1.5} aria-hidden />
            </button>
          );
        })}
        <div className="min-w-0 flex-1" />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Delete"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            keyFeedback('delete');
            onBackspace();
            onRepeatClear();
            const id = window.setInterval(() => onBackspace(), 72);
            onRepeatStart(id);
          }}
          onPointerUp={onRepeatClear}
          onPointerCancel={onRepeatClear}
          onPointerLeave={onRepeatClear}
          onClick={(e) => e.preventDefault()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/85 active:bg-white/10"
        >
          <Delete className="h-[16px] w-[16px]" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Photo 2 — focused search bar + recent/suggested emoji strip above letter keys. */
function IOSEmojiSearchChrome({
  query: queryProp,
  onPickEmoji,
  onShowPreview,
  onHidePreview,
}: {
  query?: string | null;
  onPickEmoji: (emoji: string) => void;
  onShowPreview: KeyPreviewHandler;
  onHidePreview: () => void;
}) {
  const query = typeof queryProp === 'string' ? queryProp : '';
  const recents = useMemo(() => getRecentComposerEmojis(), [query]);
  const stripEmojis = useMemo(() => {
    const q = safeTrim(query);
    if (q) {
      const hits = searchEmojis(q, recents);
      return hits.length > 0 ? hits.slice(0, 10) : recents.slice(0, 8);
    }
    return recents.length > 0 ? recents.slice(0, 8) : getEmojisForCategory('smileys', recents).slice(0, 8);
  }, [query, recents]);

  return (
    <div className="w-full shrink-0 px-1.5 pt-1 pb-0.5">
      <div
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-full bg-[#2c2c2e] px-3',
          'ring-1 ring-[#007aff]/40',
        )}
        aria-label="Search Emoji"
      >
        <Search className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[15px] text-white">
          {query}
        </span>
        <span
          className="h-[18px] w-[2px] shrink-0 animate-pulse rounded-full bg-[#007aff]"
          aria-hidden
        />
      </div>
      <div
        className={cn(
          'mt-1 flex w-full gap-1 overflow-x-auto overscroll-x-contain px-0.5 py-1',
          '[-ms-overflow-style:none] [scrollbar-width:none]',
        )}
      >
        {stripEmojis.map((emoji, idx) => (
          <button
            key={`${idx}-${emoji}`}
            type="button"
            tabIndex={-1}
            aria-label={`Emoji ${emoji}`}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
            }}
            onPointerUp={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              keyFeedback('letter');
              pushRecentComposerEmoji(emoji);
              onPickEmoji(emoji);
            }}
            onClick={(e) => e.preventDefault()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[34px] leading-none active:scale-90 touch-manipulation [-webkit-tap-highlight-color:transparent]"
            style={{
              fontFamily: IOS_EMOJI_FONT_FAMILY,
              fontVariantEmoji: 'emoji',
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

const KeyCapButton = React.memo(function KeyCapButton({
  children,
  onPress,
  className,
  flexClass,
  ariaLabel,
  previewLabel,
  skipPreview,
  keyVariant = 'letter',
  alternates,
  alternateMenuActive,
  onShowPreview,
  onHidePreview,
  onOpenAlternateMenu,
  onAlternateConsumed,
}: {
  children: React.ReactNode;
  onPress: () => void;
  className?: string;
  flexClass?: string;
  ariaLabel?: string;
  previewLabel?: string;
  /** Emoji / icon keys — no iOS letter popover */
  skipPreview?: boolean;
  keyVariant?: InsightKeyClickVariant;
  alternates?: string[];
  alternateMenuActive?: boolean;
  onShowPreview: (label: string, rect: DOMRect) => void;
  onHidePreview: () => void;
  onOpenAlternateMenu?: (payload: { chars: string[]; rect: DOMRect }) => void;
  onAlternateConsumed?: () => boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressConsumedRef = useRef(false);
  const keyRectRef = useRef<DOMRect | null>(null);
  const insertedOnUpRef = useRef(false);
  const [isPressed, setIsPressed] = useState(false);
  const label =
    previewLabel ?? (typeof children === 'string' ? String(children) : undefined);
  const isModifier = keyVariant === 'modifier';
  const baseKeyClass = isModifier ? IOS_KEY_MODIFIER : IOS_KEY_LETTER;
  const pressedKeyClass = isModifier ? IOS_KEY_MODIFIER_PRESSED : IOS_KEY_LETTER_PRESSED;

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  const release = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      clearLongPress();
      setIsPressed(false);
      if (!alternateMenuActive && !longPressConsumedRef.current) {
        onHidePreview();
      }
    },
    [clearLongPress, onHidePreview, alternateMenuActive],
  );

  return (
    <button
      ref={ref}
      type="button"
      tabIndex={-1}
      aria-label={
        ariaLabel ??
        (typeof children === 'string' ? String(children) : undefined)
      }
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        insertedOnUpRef.current = false;
        longPressConsumedRef.current = false;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        const keyEl = ref.current;
        if (!keyEl) return;
        const rect = keyEl.getBoundingClientRect();
        keyRectRef.current = rect;
        setIsPressed(true);
        keyFeedback(keyVariant);
        if (!skipPreview && label && !alternateMenuActive) {
          onShowPreview(label, rect);
        }
        if (alternates?.length && onOpenAlternateMenu) {
          clearLongPress();
          longPressTimerRef.current = setTimeout(() => {
            longPressTimerRef.current = null;
            longPressConsumedRef.current = true;
            onHidePreview();
            const r = keyRectRef.current ?? keyEl.getBoundingClientRect();
            onOpenAlternateMenu({ chars: alternates, rect: r });
          }, 400);
        }
      }}
      onPointerUp={(e) => {
        release(e);
        if (onAlternateConsumed?.()) return;
        if (longPressConsumedRef.current) {
          longPressConsumedRef.current = false;
          return;
        }
        if (!insertedOnUpRef.current) {
          insertedOnUpRef.current = true;
          onPress();
        }
      }}
      onPointerCancel={release}
      onClick={(e) => {
        e.preventDefault();
        if (insertedOnUpRef.current) return;
        if (onAlternateConsumed?.()) return;
        if (longPressConsumedRef.current) {
          longPressConsumedRef.current = false;
          return;
        }
        onPress();
      }}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'relative flex min-w-0 shrink-0 items-center justify-center',
        KEY_RADIUS,
        isPressed && !alternateMenuActive ? pressedKeyClass : baseKeyClass,
        KEY_TEXT,
        'font-normal leading-none',
        isPressed && keyVariant === 'letter' && !alternateMenuActive ? 'text-black' : 'text-white',
        'transition-[background-color,transform,filter] duration-75 ease-out select-none touch-manipulation',
        '[-webkit-tap-highlight-color:transparent]',
        isPressed && !alternateMenuActive && 'z-[2]',
        flexClass ?? cn(KEY_ROW_H, 'min-w-[34px] flex-1'),
        className
      )}
    >
      <span className="pointer-events-none">{children}</span>
    </button>
  );
});

function BackspaceButton({
  onBackspace,
  onRepeatStart,
  onRepeatClear,
  rowHeightClass = KEY_ROW_H,
}: {
  onBackspace: () => void;
  onRepeatStart: (intervalId: number) => void;
  onRepeatClear: () => void;
  rowHeightClass?: string;
}) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      type="button"
      aria-label="Backspace"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        setIsPressed(true);
        keyFeedback('delete');
        onBackspace();
        onRepeatClear();
        const id = window.setInterval(() => {
          onBackspace();
        }, 72);
        onRepeatStart(id);
      }}
      onPointerUp={() => {
        setIsPressed(false);
        onRepeatClear();
      }}
      onPointerCancel={() => {
        setIsPressed(false);
        onRepeatClear();
      }}
      onPointerLeave={() => {
        setIsPressed(false);
        onRepeatClear();
      }}
      onClick={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'flex w-[38px] shrink-0 items-center justify-center',
        rowHeightClass,
        KEY_RADIUS,
        isPressed ? IOS_KEY_MODIFIER_PRESSED : IOS_KEY_MODIFIER,
        'text-white',
        'transition-[background-color,transform,filter] duration-75 touch-manipulation',
        '[-webkit-tap-highlight-color:transparent]'
      )}
    >
      <Delete className="h-[18px] w-[18px] pointer-events-none" aria-hidden />
    </button>
  );
}

/** Blue return key — send, done (emoji search), or search/newline. */
function SearchReturnKey({
  onSubmit,
  onDone,
  onInsert,
  returnKeyMode = 'search',
}: {
  onSubmit: () => void;
  onDone?: () => void;
  onInsert?: (text: string) => void;
  returnKeyMode?: 'send' | 'search' | 'done';
}) {
  const [isPressed, setIsPressed] = useState(false);
  const actedRef = useRef(false);
  const isSend = returnKeyMode === 'send';
  const isDone = returnKeyMode === 'done';

  const release = useCallback(() => setIsPressed(false), []);

  const fireAction = useCallback(() => {
    if (isDone) {
      onDone?.();
      return;
    }
    if (isSend) {
      onSubmit();
      return;
    }
    onInsert?.('\n');
  }, [isDone, isSend, onDone, onInsert, onSubmit]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      release();
      if (actedRef.current) return;
      actedRef.current = true;
      fireAction();
    },
    [fireAction, release],
  );

  const ariaLabel = isDone ? 'Done' : isSend ? 'Send' : 'Return';

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        actedRef.current = false;
        setIsPressed(true);
        keyFeedback('return');
      }}
      onPointerUp={handlePointerUp}
      onPointerCancel={release}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'flex min-w-[72px] shrink-0 items-center justify-center',
        KEY_ROW_H,
        KEY_RADIUS,
        isPressed ? IOS_KEY_RETURN_PRESSED : IOS_KEY_RETURN,
        'text-white',
        'touch-manipulation [-webkit-tap-highlight-color:transparent]',
        'transition-[background-color,transform,filter] duration-75 ease-out'
      )}
    >
      {isDone ? (
        <Check
          className="pointer-events-none h-[22px] w-[22px]"
          strokeWidth={2.75}
          aria-hidden
        />
      ) : isSend ? (
        <ArrowUp
          className="pointer-events-none h-[20px] w-[20px]"
          strokeWidth={2.5}
          aria-hidden
        />
      ) : (
        <CornerDownLeft
          className="pointer-events-none h-[20px] w-[20px]"
          strokeWidth={2.25}
          aria-hidden
        />
      )}
    </button>
  );
}

/** iOS-style popover from long-press on accessory smiley (Keyboard Settings, one-handed, cancel). */
function IOSGlobeKeyboardOptionsMenu({
  open,
  onClose,
  anchorRef,
  onUseSystemKeyboard,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onUseSystemKeyboard?: () => void;
}) {
  const [settingsDetail, setSettingsDetail] = useState(false);
  const [settingsCopied, setSettingsCopied] = useState(false);
  useEffect(() => {
    if (!open) {
      setSettingsDetail(false);
      setSettingsCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (ev: Event) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      if (anchorRef.current?.contains(t)) return;
      if (t.closest('[data-insight-globe-menu]')) return;
      onClose();
    };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      data-insight-globe-menu
      className={cn(
        'absolute z-[1275] w-[min(calc(100vw-24px),280px)] overflow-hidden rounded-[14px]',
        'border border-white/18',
        'text-[17px] text-white',
        'shadow-[0_12px_40px_rgba(0,0,0,0.45)]'
      )}
      style={{
        left: 8,
        bottom: 'calc(100% + 8px)',
        WebkitBackdropFilter: 'blur(48px) saturate(190%)',
        backdropFilter: 'blur(48px) saturate(190%)',
        backgroundColor: 'rgba(58, 58, 60, 0.65)',
      }}
      role="menu"
    >
      {settingsDetail ? (
        <div className="px-4 py-3">
          <p className="text-[13px] leading-snug text-white/85">
            {getKeyboardSettingsInstructions()}
          </p>
          <button
            type="button"
            className={cn(
              'mt-3 w-full rounded-xl bg-[#007aff] py-2.5 text-[17px] font-semibold text-white',
              'active:opacity-90 touch-manipulation'
            )}
            onClick={() => {
              lightHaptic();
              void openIOSAppSettings();
            }}
          >
            Open Settings
          </button>
          <button
            type="button"
            className={cn(
              'mt-2 w-full rounded-xl bg-white/12 py-2.5 text-[17px] font-medium text-white',
              'active:bg-white/18 touch-manipulation'
            )}
            onClick={() => {
              lightHaptic();
              void copyKeyboardSettingsInstructions().then((ok) => {
                if (ok) setSettingsCopied(true);
              });
            }}
          >
            {settingsCopied ? 'Copied' : 'Copy steps'}
          </button>
          <button
            type="button"
            className={cn(
              'mt-2 w-full rounded-xl py-2.5 text-[17px] font-medium text-white/80',
              'active:opacity-90 touch-manipulation'
            )}
            onClick={() => {
              lightHaptic();
              onClose();
            }}
          >
            Done
          </button>
        </div>
      ) : (
        <>
          {onUseSystemKeyboard ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center px-4 py-3.5 text-left active:bg-white/12 touch-manipulation"
                onClick={() => {
                  lightHaptic();
                  onUseSystemKeyboard();
                  onClose();
                }}
              >
                Use iOS Keyboard
              </button>
              <div className="mx-3 h-px bg-white/12" />
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-4 py-3.5 text-left active:bg-white/12 touch-manipulation"
            onClick={() => {
              lightHaptic();
              setSettingsDetail(true);
            }}
          >
            Keyboard Settings
          </button>
          <div className="mx-3 h-px bg-white/12" />
          <div className="px-3 py-2">
            <p className="px-1 pb-2 text-[13px] text-white/55">
              One-Handed Keyboard
            </p>
            <div className="flex gap-2">
              {(
                [
                  ['Left', 'Pin keyboard to the left'],
                  ['Center', 'Default width'],
                  ['Right', 'Pin keyboard to the right'],
                ] as const
              ).map(([label, hint]) => (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    'min-h-[44px] flex-1 rounded-xl bg-white/10 py-2 text-[15px] font-medium',
                    'active:bg-white/18 touch-manipulation'
                  )}
                  title={hint}
                  onClick={() => {
                    lightHaptic();
                    onClose();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mx-3 h-px bg-white/12" />
          <button
            type="button"
            role="menuitem"
            className="w-full px-4 py-3.5 text-center text-[17px] text-white/95 active:bg-white/12 touch-manipulation"
            onClick={() => {
              lightHaptic();
              onClose();
            }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

type AccessoryMode = 'letters' | 'emoji-grid' | 'emoji-search';

/** Bottom safe-area strip — Telegram: smile/ABC · spacer · dictation. */
function SafeAreaAccessoryRow({
  accessoryMode,
  dictationListening,
  onOpenEmoji,
  onExitEmojiToLetters,
  onExitEmojiSearch,
  onDictation,
  globeMenuOpen,
  setGlobeMenuOpen,
  globeAnchorRef,
  onUseSystemKeyboard,
}: {
  accessoryMode: AccessoryMode;
  dictationListening: boolean;
  onOpenEmoji: () => void;
  onExitEmojiToLetters: () => void;
  onExitEmojiSearch: () => void;
  onDictation: () => void;
  globeMenuOpen: boolean;
  setGlobeMenuOpen: (open: boolean) => void;
  globeAnchorRef: React.RefObject<HTMLButtonElement | null>;
  onUseSystemKeyboard?: () => void;
}) {
  const showAbc = accessoryMode === 'emoji-grid';
  const showSmile = accessoryMode === 'letters' || accessoryMode === 'emoji-search';
  const enableGlobeMenu = accessoryMode === 'letters';
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressConsumedRef = useRef(false);
  const tapConsumedRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleLeftTap = useCallback(() => {
    lightHaptic();
    if (accessoryMode === 'emoji-grid') onExitEmojiToLetters();
    else if (accessoryMode === 'emoji-search') onExitEmojiSearch();
    else onOpenEmoji();
  }, [accessoryMode, onExitEmojiToLetters, onExitEmojiSearch, onOpenEmoji]);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  return (
    <div
      className="relative mx-auto w-full max-w-lg shrink-0 border-t border-white/10 bg-[#1c1c1e]/95"
      style={{
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      <IOSGlobeKeyboardOptionsMenu
        open={globeMenuOpen}
        onClose={() => setGlobeMenuOpen(false)}
        anchorRef={globeAnchorRef}
        onUseSystemKeyboard={onUseSystemKeyboard}
      />
      <div className="flex w-full items-center justify-between px-2 pt-1.5">
        <button
          ref={globeAnchorRef}
          type="button"
          tabIndex={-1}
          aria-label={showAbc ? 'Letters' : 'Emoji'}
          aria-haspopup={enableGlobeMenu ? 'menu' : undefined}
          aria-expanded={enableGlobeMenu ? globeMenuOpen : undefined}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            tapConsumedRef.current = false;
            longPressConsumedRef.current = false;
            clearLongPressTimer();
            if (!enableGlobeMenu) return;
            longPressTimerRef.current = setTimeout(() => {
              longPressTimerRef.current = null;
              longPressConsumedRef.current = true;
              tapConsumedRef.current = true;
              lightHaptic();
              setGlobeMenuOpen(true);
            }, 480);
          }}
          onPointerUp={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            clearLongPressTimer();
            if (longPressConsumedRef.current) {
              longPressConsumedRef.current = false;
              return;
            }
            if (!tapConsumedRef.current) {
              tapConsumedRef.current = true;
              handleLeftTap();
            }
          }}
          onPointerCancel={clearLongPressTimer}
          onClick={(e) => {
            e.preventDefault();
            if (tapConsumedRef.current) return;
            tapConsumedRef.current = true;
            handleLeftTap();
          }}
          className={cn(
            'flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-1',
            'text-white active:opacity-70',
            'touch-manipulation [-webkit-tap-highlight-color:transparent]',
          )}
        >
          {showAbc ? (
            <span className="text-[15px] font-medium tracking-wide">ABC</span>
          ) : showSmile ? (
            <Smile className="h-7 w-7" strokeWidth={1.35} aria-hidden />
          ) : null}
        </button>
        <div className="min-h-[36px] min-w-0 flex-1" aria-hidden />
        <button
          type="button"
          tabIndex={-1}
          aria-label={dictationListening ? 'Stop dictation' : 'Dictation'}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
          }}
          onPointerUp={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            lightHaptic();
            onDictation();
          }}
          onClick={(e) => {
            e.preventDefault();
            lightHaptic();
            onDictation();
          }}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            'text-white active:opacity-70',
            dictationListening && 'text-[#0a84ff]',
            'touch-manipulation [-webkit-tap-highlight-color:transparent]'
          )}
        >
          <Mic
            className={cn('h-7 w-7', dictationListening && 'animate-pulse')}
            strokeWidth={1.35}
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}

export interface InsightIOSVirtualKeyboardProps {
  open: boolean;
  onInsert: (text: string) => void;
  onPasteText: (text: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onHeightChange?: (px: number) => void;
  returnKeyMode?: 'send' | 'search';
  /** When true, render keys only (parent stack owns chrome + portal). */
  embedded?: boolean;
  /** Open directly to emoji layout (e.g. composer emoji button). */
  initialLayout?: 'letters' | 'emoji' | null;
  onInitialLayoutConsumed?: () => void;
  /** Switch from custom keyboard to native iOS keyboard. */
  onUseSystemKeyboard?: () => void;
}

/**
 * iOS-style keyboard: frosted plate (backdrop blur + tint), translucent keys, SF layout;
 * emoji grid uses CLDR smileys order and Apple Color Emoji on iOS. No WebKit input-accessory pill.
 */
export function InsightIOSVirtualKeyboard({
  open,
  onInsert,
  onPasteText,
  onBackspace,
  onSubmit,
  onHeightChange,
  returnKeyMode = 'search',
  embedded = false,
  initialLayout = null,
  onInitialLayoutConsumed,
  onUseSystemKeyboard,
}: InsightIOSVirtualKeyboardProps) {
  const reduceMotion = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutMode>('letters');
  const [shiftNext, setShiftNext] = useState(false);
  const [stemPreview, setStemPreview] = useState<StemPreview | null>(null);
  const [alternateMenu, setAlternateMenu] = useState<AlternateMenu | null>(null);
  const [dictationListening, setDictationListening] = useState(false);
  const [globeMenuOpen, setGlobeMenuOpen] = useState(false);
  const [emojiSearchFocused, setEmojiSearchFocused] = useState(false);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const emojiSearchCaretRef = useRef(0);
  const globeAnchorRef = useRef<HTMLButtonElement>(null);

  const rowHeightClass = KEY_ROW_H;
  const keyGapClass = KEY_GAP;
  const gridMaxWidthClass = 'max-w-lg';

  const recognitionRef = useRef<InstanceType<
    NonNullable<ReturnType<typeof getSpeechRecognitionCtor>>
  > | null>(null);
  const backspaceRepeatRef = useRef<number | null>(null);

  const clearBackspaceRepeat = useCallback(() => {
    if (backspaceRepeatRef.current != null) {
      clearInterval(backspaceRepeatRef.current);
      backspaceRepeatRef.current = null;
    }
  }, []);

  const registerRepeatInterval = useCallback(
    (id: number) => {
      clearBackspaceRepeat();
      backspaceRepeatRef.current = id;
    },
    [clearBackspaceRepeat]
  );

  const routeInsert = useCallback(
    (text: string) => {
      if (layout === 'emoji' && emojiSearchFocused) {
        const start = emojiSearchCaretRef.current;
        setEmojiSearchQuery((prev) => {
          const next = prev.slice(0, start) + text + prev.slice(start);
          emojiSearchCaretRef.current = start + text.length;
          return next;
        });
        return;
      }
      onInsert(text);
    },
    [layout, emojiSearchFocused, onInsert],
  );

  const routeBackspace = useCallback(() => {
    if (layout === 'emoji' && emojiSearchFocused) {
      const start = emojiSearchCaretRef.current;
      if (start <= 0) return;
      setEmojiSearchQuery((prev) => {
        const base = typeof prev === 'string' ? prev : '';
        const next = base.slice(0, start - 1) + base.slice(start);
        emojiSearchCaretRef.current = start - 1;
        return next;
      });
      return;
    }
    onBackspace();
  }, [layout, emojiSearchFocused, onBackspace]);

  const routePaste = useCallback(
    (text: string) => {
      if (!safeTrim(text)) return;
      if (layout === 'emoji' && emojiSearchFocused) {
        routeInsert(text);
        return;
      }
      onPasteText(text);
    },
    [layout, emojiSearchFocused, onPasteText, routeInsert],
  );

  const activateEmojiSearch = useCallback(() => {
    emojiSearchCaretRef.current = safeTrim(emojiSearchQuery).length;
    setEmojiSearchFocused(true);
  }, [emojiSearchQuery]);

  const exitEmojiSearch = useCallback(() => {
    setEmojiSearchFocused(false);
    emojiSearchCaretRef.current = safeTrim(emojiSearchQuery).length;
  }, [emojiSearchQuery]);

  const showLetterKeys =
    layout === 'letters' || (layout === 'emoji' && emojiSearchFocused);

  const effectiveReturnKeyMode: 'send' | 'search' | 'done' =
    layout === 'emoji' && emojiSearchFocused ? 'done' : returnKeyMode;

  const accessoryMode: AccessoryMode =
    layout === 'emoji' && emojiSearchFocused
      ? 'emoji-search'
      : layout === 'emoji'
        ? 'emoji-grid'
        : 'letters';

  const insertLetter = useCallback(
    (lower: string) => {
      const ch = shiftNext ? lower.toUpperCase() : lower;
      setShiftNext(false);
      routeInsert(ch);
    },
    [routeInsert, shiftNext],
  );

  const showPreview = useCallback(
    (label: string, rect: DOMRect, kind: 'letter' | 'emoji' = 'letter') => {
      if (alternateMenu) return;
      flushSync(() => {
        setStemPreview({ label, rect, kind });
      });
    },
    [alternateMenu],
  );

  const hidePreview = useCallback(() => {
    flushSync(() => {
      setStemPreview(null);
    });
  }, []);

  const openAlternateMenu = useCallback(
    (payload: { chars: string[]; rect: DOMRect }) => {
      flushSync(() => {
        setStemPreview(null);
        setAlternateMenu({ ...payload, selectedIndex: 0 });
      });
      lightHaptic();
    },
    [],
  );

  const consumeAlternateMenu = useCallback(() => {
    if (!alternateMenu) return false;
    const ch = alternateMenu.chars[alternateMenu.selectedIndex];
    if (ch) routeInsert(ch);
    setAlternateMenu(null);
    return true;
  }, [alternateMenu, routeInsert]);

  useEffect(() => {
    if (!alternateMenu) return;
    const onUp = () => {
      consumeAlternateMenu();
    };
    document.addEventListener('pointerup', onUp, { capture: true });
    return () => document.removeEventListener('pointerup', onUp, { capture: true });
  }, [alternateMenu, consumeAlternateMenu]);

  useEffect(() => {
    if (!alternateMenu) return;
    const onMove = (ev: PointerEvent) => {
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      if (!(target instanceof Element)) return;
      const option = target.closest('[data-alt-char-index]');
      if (!option) return;
      const idx = Number(option.getAttribute('data-alt-char-index'));
      if (!Number.isFinite(idx)) return;
      setAlternateMenu((prev) =>
        prev && prev.selectedIndex !== idx ? { ...prev, selectedIndex: idx } : prev,
      );
    };
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, [alternateMenu]);

  const stopDictation = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setDictationListening(false);
  }, []);

  const startDictation = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      return;
    }
    if (dictationListening) {
      stopDictation();
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang =
        typeof navigator !== 'undefined' && navigator.language
          ? navigator.language
          : 'en-US';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (ev: Event) => {
        const e = ev as unknown as {
          resultIndex: number;
          results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
        };
        let chunk = '';
        for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal && r[0]?.transcript) chunk += r[0].transcript;
        }
        if (safeTrim(chunk)) {
          routePaste(chunk);
        }
      };

      rec.onerror = (ev: Event) => {
        const err = (ev as unknown as { error?: string }).error ?? 'error';
        if (err === 'aborted' || err === 'no-speech') {
          return;
        }
        setDictationListening(false);
      };

      rec.onend = () => {
        setDictationListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = rec;
      rec.start();
      setDictationListening(true);
    } catch {
      setDictationListening(false);
    }
  }, [dictationListening, routePaste, stopDictation]);

  useEffect(() => {
    if (!open) {
      setLayout('letters');
      setShiftNext(false);
      setStemPreview(null);
      setAlternateMenu(null);
      setEmojiSearchFocused(false);
      setEmojiSearchQuery('');
      emojiSearchCaretRef.current = 0;
      clearBackspaceRepeat();
      stopDictation();
      setGlobeMenuOpen(false);
      if (!embedded) onHeightChange?.(0);
    }
  }, [open, clearBackspaceRepeat, stopDictation, onHeightChange, embedded]);

  useEffect(() => {
    if (layout !== 'emoji') {
      setEmojiSearchFocused(false);
    }
  }, [layout]);

  useEffect(() => {
    if (!open || !initialLayout) return;
    if (initialLayout === 'emoji') {
      setLayout('emoji');
      setEmojiSearchFocused(false);
    }
    onInitialLayoutConsumed?.();
  }, [open, initialLayout, onInitialLayoutConsumed]);

  useLayoutEffect(() => {
    if (!open || embedded) return;
    const el = sheetRef.current;
    if (!el) return;
    const report = () => {
      onHeightChange?.(Math.ceil(el.getBoundingClientRect().height));
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, layout, onHeightChange, embedded]);

  useEffect(() => {
    return () => {
      clearBackspaceRepeat();
      stopDictation();
    };
  }, [clearBackspaceRepeat, stopDictation]);

  const goToNumbers = useCallback(() => {
    setShiftNext(false);
    setLayout('numbers');
  }, []);

  const goToLetters = useCallback(() => {
    setShiftNext(false);
    setLayout('letters');
  }, []);

  const goToSymbols = useCallback(() => setLayout('symbols'), []);

  const letterFunctionRow = (
    <div className={cn('flex w-full items-center', keyGapClass)}>
      <KeyCapButton
        flexClass={cn(rowHeightClass, 'w-[46px] shrink-0 text-[15px] font-medium')}
        keyVariant="modifier"
        skipPreview
        onShowPreview={showPreview}
        onHidePreview={hidePreview}
        onPress={goToNumbers}
        ariaLabel="Numbers"
      >
        123
      </KeyCapButton>
      <KeyCapButton
        flexClass={cn(rowHeightClass, 'min-w-0 flex-1')}
        skipPreview
        onShowPreview={showPreview}
        onHidePreview={hidePreview}
        onPress={() => routeInsert(' ')}
        ariaLabel="Space"
      >
        {' '}
      </KeyCapButton>
      <SearchReturnKey
        onSubmit={onSubmit}
        onDone={exitEmojiSearch}
        onInsert={routeInsert}
        returnKeyMode={effectiveReturnKeyMode}
      />
    </div>
  );

  const numbersFunctionRow = (
    <div className={cn('flex w-full items-center', keyGapClass)}>
      <KeyCapButton
        flexClass={cn(rowHeightClass, 'w-[46px] shrink-0 text-[15px] font-medium')}
        keyVariant="modifier"
        skipPreview
        onShowPreview={showPreview}
        onHidePreview={hidePreview}
        onPress={goToLetters}
        ariaLabel="Letters"
      >
        ABC
      </KeyCapButton>
      <KeyCapButton
        flexClass={cn(rowHeightClass, 'min-w-0 flex-1')}
        skipPreview
        onShowPreview={showPreview}
        onHidePreview={hidePreview}
        onPress={() => routeInsert(' ')}
        ariaLabel="Space"
      >
        {' '}
      </KeyCapButton>
      <SearchReturnKey
        onSubmit={onSubmit}
        onDone={exitEmojiSearch}
        onInsert={routeInsert}
        returnKeyMode={effectiveReturnKeyMode}
      />
    </div>
  );

  const renderPunctuationRow = (
    leadingKey: { label: string; ariaLabel: string; onPress: () => void },
  ) => (
    <div className={cn('flex w-full items-center', keyGapClass)}>
      <KeyCapButton
        flexClass={cn(rowHeightClass, 'w-[46px] shrink-0 text-[13px] font-medium')}
        keyVariant="modifier"
        skipPreview
        onShowPreview={showPreview}
        onHidePreview={hidePreview}
        onPress={leadingKey.onPress}
        ariaLabel={leadingKey.ariaLabel}
      >
        {leadingKey.label}
      </KeyCapButton>
      {NUM_ROW3.map((k) => (
        <KeyCapButton
          key={k}
          flexClass={cn(rowHeightClass, 'min-w-[34px] flex-1')}
          previewLabel={k}
          onShowPreview={showPreview}
          onHidePreview={hidePreview}
          onPress={() => routeInsert(k)}
        >
          {k}
        </KeyCapButton>
      ))}
      <BackspaceButton
        onBackspace={routeBackspace}
        onRepeatStart={registerRepeatInterval}
        onRepeatClear={clearBackspaceRepeat}
        rowHeightClass={rowHeightClass}
      />
    </div>
  );

  const safeAreaRow = (
    <SafeAreaAccessoryRow
      accessoryMode={accessoryMode}
      dictationListening={dictationListening}
      onOpenEmoji={() => {
        setShiftNext(false);
        setEmojiSearchFocused(false);
        setLayout('emoji');
      }}
      onExitEmojiToLetters={() => {
        setEmojiSearchFocused(false);
        setLayout('letters');
      }}
      onExitEmojiSearch={exitEmojiSearch}
      onDictation={startDictation}
      globeMenuOpen={globeMenuOpen}
      setGlobeMenuOpen={setGlobeMenuOpen}
      globeAnchorRef={globeAnchorRef}
      onUseSystemKeyboard={onUseSystemKeyboard}
    />
  );

  const keyboardFontClass =
    'font-[system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif]';

  const previewOverlays = (
    <>
      {stemPreview ? (
        <IOSKeyStemPreview preview={stemPreview} reduceMotion={reduceMotion} />
      ) : null}
      {alternateMenu ? (
        <IOSAlternateKeyStrip
          menu={alternateMenu}
          onSelectIndex={(idx) =>
            setAlternateMenu((prev) =>
              prev ? { ...prev, selectedIndex: idx } : prev,
            )
          }
          reduceMotion={reduceMotion}
        />
      ) : null}
    </>
  );

  const previewPortal =
    typeof document !== 'undefined' && open && (stemPreview || alternateMenu)
      ? createPortal(previewOverlays, document.body)
      : null;

  const keyboardLayouts = open ? (
      <div className={cn('mx-auto flex w-full flex-col px-1', gridMaxWidthClass, keyGapClass)}>
              {layout === 'emoji' && emojiSearchFocused ? (
                <IOSEmojiSearchChrome
                  query={emojiSearchQuery}
                  onPickEmoji={onInsert}
                  onShowPreview={showPreview}
                  onHidePreview={hidePreview}
                />
              ) : null}

              {layout === 'emoji' && !emojiSearchFocused ? (
                <IOSEmojiKeyboardPanel
                  searchQuery={emojiSearchQuery}
                  onActivateSearch={activateEmojiSearch}
                  onPickEmoji={onInsert}
                  onBackspace={routeBackspace}
                  onRepeatStart={registerRepeatInterval}
                  onRepeatClear={clearBackspaceRepeat}
                  onShowPreview={showPreview}
                  onHidePreview={hidePreview}
                />
              ) : null}

              {showLetterKeys ? (
                <>
                  <div
                    className={cn(
                      'flex w-full justify-center px-[2px]',
                      keyGapClass
                    )}
                  >
                    {ROW_QWERTY.map((k) => (
                      <KeyCapButton
                        key={k}
                        flexClass={cn(rowHeightClass, 'min-w-[34px] flex-1')}
                        previewLabel={shiftNext ? k.toUpperCase() : k}
                        alternates={getLetterAlternates(k)}
                        alternateMenuActive={!!alternateMenu}
                        onOpenAlternateMenu={openAlternateMenu}
                        onAlternateConsumed={consumeAlternateMenu}
                        onShowPreview={showPreview}
                        onHidePreview={hidePreview}
                        onPress={() => insertLetter(k)}
                      >
                        {shiftNext ? k.toUpperCase() : k}
                      </KeyCapButton>
                    ))}
                  </div>
                  <div
                    className={cn('flex w-full justify-center px-3', KEY_GAP)}
                  >
                    {ROW_ASDF.map((k) => (
                      <KeyCapButton
                        key={k}
                        previewLabel={shiftNext ? k.toUpperCase() : k}
                        alternates={getLetterAlternates(k)}
                        alternateMenuActive={!!alternateMenu}
                        onOpenAlternateMenu={openAlternateMenu}
                        onAlternateConsumed={consumeAlternateMenu}
                        onShowPreview={showPreview}
                        onHidePreview={hidePreview}
                        onPress={() => insertLetter(k)}
                      >
                        {shiftNext ? k.toUpperCase() : k}
                      </KeyCapButton>
                    ))}
                  </div>
                  <div className={cn('flex w-full items-center', keyGapClass)}>
                    <KeyCapButton
                      flexClass={cn(rowHeightClass, 'w-[40px] shrink-0 px-0')}
                      keyVariant="modifier"
                      className={shiftNext ? 'brightness-125' : undefined}
                      onShowPreview={showPreview}
                      onHidePreview={hidePreview}
                      onPress={() => setShiftNext((s) => !s)}
                      ariaLabel="Shift"
                      previewLabel="⇧"
                      skipPreview
                    >
                      <ChevronUp
                        className={cn(
                          'h-[18px] w-[18px]',
                          shiftNext && 'opacity-100'
                        )}
                        aria-hidden
                      />
                    </KeyCapButton>
                    <div
                      className={cn(
                        'flex min-w-0 flex-1 justify-center',
                        keyGapClass
                      )}
                    >
                      {ROW_ZXCV.map((k) => (
                        <KeyCapButton
                          key={k}
                          flexClass={cn(rowHeightClass, 'min-w-[34px] flex-1')}
                          previewLabel={shiftNext ? k.toUpperCase() : k}
                          alternates={getLetterAlternates(k)}
                          alternateMenuActive={!!alternateMenu}
                          onOpenAlternateMenu={openAlternateMenu}
                          onAlternateConsumed={consumeAlternateMenu}
                          onShowPreview={showPreview}
                          onHidePreview={hidePreview}
                          onPress={() => insertLetter(k)}
                        >
                          {shiftNext ? k.toUpperCase() : k}
                        </KeyCapButton>
                      ))}
                    </div>
                    <BackspaceButton
                      onBackspace={routeBackspace}
                      onRepeatStart={registerRepeatInterval}
                      onRepeatClear={clearBackspaceRepeat}
                      rowHeightClass={rowHeightClass}
                    />
                  </div>
                  {letterFunctionRow}
                </>
              ) : null}

              {layout === 'numbers' ? (
                <>
                  <div className={cn('flex w-full justify-center', keyGapClass)}>
                    {NUM_ROW1.map((k) => (
                      <KeyCapButton
                        key={k}
                        flexClass={cn(rowHeightClass, 'min-w-[34px] flex-1')}
                        previewLabel={k}
                        onShowPreview={showPreview}
                        onHidePreview={hidePreview}
                        onPress={() => routeInsert(k)}
                      >
                        {k}
                      </KeyCapButton>
                    ))}
                  </div>
                  <div className={cn('flex w-full justify-center', keyGapClass)}>
                    {NUM_ROW2.map((k) => (
                      <KeyCapButton
                        key={k}
                        flexClass={cn(rowHeightClass, 'min-w-[34px] flex-1')}
                        previewLabel={k}
                        onShowPreview={showPreview}
                        onHidePreview={hidePreview}
                        onPress={() => routeInsert(k)}
                      >
                        {k}
                      </KeyCapButton>
                    ))}
                  </div>
                  {renderPunctuationRow({
                    label: '#+=',
                    ariaLabel: 'More symbols',
                    onPress: goToSymbols,
                  })}
                  {numbersFunctionRow}
                </>
              ) : null}

              {layout === 'symbols' ? (
                <>
                  <div className={cn('flex w-full justify-center', keyGapClass)}>
                    {SYM_ROW1.map((k) => (
                      <KeyCapButton
                        key={k}
                        flexClass={cn(rowHeightClass, 'min-w-[34px] flex-1')}
                        previewLabel={k}
                        onShowPreview={showPreview}
                        onHidePreview={hidePreview}
                        onPress={() => routeInsert(k)}
                      >
                        {k}
                      </KeyCapButton>
                    ))}
                  </div>
                  <div className={cn('flex w-full justify-center', keyGapClass)}>
                    {SYM_ROW2.map((k) => (
                      <KeyCapButton
                        key={k}
                        flexClass={cn(rowHeightClass, 'min-w-[34px] flex-1')}
                        previewLabel={k}
                        onShowPreview={showPreview}
                        onHidePreview={hidePreview}
                        onPress={() => routeInsert(k)}
                      >
                        {k}
                      </KeyCapButton>
                    ))}
                  </div>
                  {renderPunctuationRow({
                    label: '123',
                    ariaLabel: 'Numbers',
                    onPress: goToNumbers,
                  })}
                  {numbersFunctionRow}
                </>
              ) : null}
      </div>
  ) : null;

  const keyboardWithAccessory = open ? (
    <>
      {keyboardLayouts}
      {safeAreaRow}
    </>
  ) : null;

  if (embedded) {
    if (!open) return null;
    return (
      <>
        {previewPortal}
        <div
          ref={sheetRef}
          className="flex min-h-0 flex-col rounded-t-[14px] bg-[#1c1c1e]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <div className={cn(keyboardFontClass, 'min-h-0 overflow-hidden pt-0.5')}>
            {keyboardLayouts}
          </div>
          {safeAreaRow}
        </div>
      </>
    );
  }

  const slideTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'tween' as const, ...INSIGHT_VK_MOTION.open };

  const exitTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'tween' as const, ...INSIGHT_VK_MOTION.exit };

  const chrome =
    typeof document !== 'undefined' ? (
      <AnimatePresence mode="sync">
        {open ? (
          <motion.div
            ref={sheetRef}
            key="insight-ios-vk"
            initial={{ bottom: reduceMotion ? 0 : -560 }}
            animate={{ bottom: 0 }}
            exit={{
              bottom: reduceMotion ? 0 : -560,
              transition: exitTransition,
            }}
            transition={slideTransition}
            className={cn(
              KEYBOARD_Z,
              'fixed left-0 right-0 md:right-[4.5rem]',
              insightVirtualKeyboardSheetGlassClass,
              'pt-1.5 pb-0',
              keyboardFontClass,
              'pl-[max(4px,env(safe-area-inset-left))]',
              'pr-[max(4px,env(safe-area-inset-right))]',
            )}
          >
            {keyboardWithAccessory}
          </motion.div>
        ) : null}
      </AnimatePresence>
    ) : null;

  if (typeof document === 'undefined') return null;

  return (
    <>
      {previewPortal}
      {chrome ? createPortal(chrome, document.body) : null}
    </>
  );
}
