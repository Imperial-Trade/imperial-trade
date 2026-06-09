import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  type CSSProperties,
} from "react";
import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { PaperPlaneRight, Smiley, Paperclip, X, Lightning, Plus, PencilSimple, Check } from "@phosphor-icons/react";
import type { ChatMessage } from "@/hooks/pattern-stream/useRoomMessages";
import { cn } from "@/lib/utils";
import { useCompactOrderflowNav, useStandaloneDisplayMode } from "@/hooks/use-mobile";
import { useInsightVirtualComposerKeyboard } from "@/hooks/useInsightVirtualComposerKeyboard";
import {
  ORDERFLOW_FEED_COMMENTS_COMPOSER_HEIGHT_CSS_VAR,
  feedCommentsComposerSlotBaseClass,
  feedCommentsMobileBarGlassExpandedClass,
  feedCommentsMobileBarGlassExpandedStandaloneClass,
  feedCommentsMobileBarGlassPillCollapsedClass,
  feedCommentsMobileBarGlassPillStandaloneClass,
} from "@/insight/orderflowChrome";
import { INSIGHT_FOCUS_RING } from "@/insight/insightCardTokens";
import { InsightChatInputStack } from "@/insight/InsightChatInputStack";
import { InsightIOSVirtualKeyboard } from "@/insight/InsightIOSVirtualKeyboard";
import { resumeInsightKeyboardAudio } from "@/utils/insightKeyboardClickSound";

export type MessageComposerVariant = "pattern" | "insight";

export type MessageComposerHandle = {
  blurKeyboard: () => void;
};

interface MessageComposerProps {
  onSend: (text: string, parentMessageId?: string | null) => Promise<void> | void;
  onTyping?: (typing: boolean) => void;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
  /** Message currently being edited — text loads into the composer (Messenger-style). */
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (newText: string) => void | Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  variant?: MessageComposerVariant;
  keyboardInsetPx?: number;
  /** Reports virtual or native keyboard overlap for list anchoring. */
  onEffectiveKeyboardInsetChange?: (px: number) => void;
  /**
   * Pillar 2 — Open the "Create signal" sheet from the chat composer.
   * Only rendered when `canCreateSignal` is true on the insight variant.
   */
  onOpenCreateSignal?: () => void;
  canCreateSignal?: boolean;
}

export const MessageComposer = forwardRef<MessageComposerHandle, MessageComposerProps>(
  function MessageComposer(
    {
      onSend,
      onTyping,
      replyingTo,
      onCancelReply,
      editingMessage,
      onCancelEdit,
      onSaveEdit,
      disabled,
      disabledReason,
      variant = "pattern",
      keyboardInsetPx = 0,
      onEffectiveKeyboardInsetChange,
      onOpenCreateSignal,
      canCreateSignal,
    },
    ref,
  ) {
    const [value, setValue] = useState("");
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [insightMultiline, setInsightMultiline] = useState(false);
    const [mobileThreadComposerExpanded, setMobileThreadComposerExpanded] = useState(false);
    const [composerSurfacePrimed, setComposerSurfacePrimed] = useState(false);
    const [threadComposerFocused, setThreadComposerFocused] = useState(false);

    const taRef = useRef<HTMLTextAreaElement>(null);
    const typingTimer = useRef<number | null>(null);
    const insightMeasureRef = useRef<HTMLDivElement>(null);
    const previousKeyboardInsetRef = useRef(0);
    const isInsight = variant === "insight";
    const compact = useCompactOrderflowNav();
    const standaloneDisplay = useStandaloneDisplayMode();

    const vk = useInsightVirtualComposerKeyboard({
      enabled: isInsight,
      value,
      setValue,
      textareaRef: taRef,
      onTyping,
      typingTimerRef: typingTimer,
    });

    const {
      virtualKeyboardEligible,
      keyboardMode,
      useCustomVirtualKb,
      virtualOpen,
      virtualHeightPx,
      vkLayoutRequest,
      open: openVirtualKeyboard,
      close: closeVirtualKeyboard,
      useSystemKeyboard,
      restoreVirtualKeyboardMode,
      syncCaretFromTextarea,
      setCaret,
      insertAtCursor,
      backspaceAtCursor,
      pasteAtCursor,
      requestEmojiLayout,
      clearLayoutRequest,
      onVirtualHeightChange,
    } = vk;

    const inVirtualStack = useCustomVirtualKb && virtualOpen;

    const handleUseSystemKeyboard = useCallback(() => {
      setMobileThreadComposerExpanded(true);
      setThreadComposerFocused(true);
      useSystemKeyboard();
    }, [useSystemKeyboard]);

    useImperativeHandle(
      ref,
      () => ({
        blurKeyboard: () => {
          if (virtualKeyboardEligible) {
            closeVirtualKeyboard();
            setThreadComposerFocused(false);
          }
          taRef.current?.blur();
        },
      }),
      [virtualKeyboardEligible, closeVirtualKeyboard],
    );

    const effectiveKeyboardInsetPx = useMemo(() => {
      if (useCustomVirtualKb && virtualOpen) return virtualHeightPx;
      return keyboardInsetPx;
    }, [useCustomVirtualKb, virtualOpen, virtualHeightPx, keyboardInsetPx]);

    useEffect(() => {
      onEffectiveKeyboardInsetChange?.(effectiveKeyboardInsetPx);
    }, [effectiveKeyboardInsetPx, onEffectiveKeyboardInsetChange]);

    const commentsPageComposerLiftPx = useMemo(() => {
      if (!isInsight || !mobileThreadComposerExpanded) return 0;
      if (useCustomVirtualKb && virtualOpen) return 0;
      return keyboardInsetPx;
    }, [
      isInsight,
      mobileThreadComposerExpanded,
      useCustomVirtualKb,
      virtualOpen,
      keyboardInsetPx,
    ]);

    const threadComposerKeyboardScrollStyle = useMemo(() => {
      if (!isInsight || commentsPageComposerLiftPx <= 0) return undefined;
      if (typeof window === "undefined") return undefined;
      const reserve = 88;
      const h = window.innerHeight;
      const cap = Math.min(h * 0.52, Math.max(0, h - commentsPageComposerLiftPx - reserve));
      return { maxHeight: `${Math.max(176, Math.floor(cap))}px` } as CSSProperties;
    }, [isInsight, commentsPageComposerLiftPx]);

    useEffect(() => {
      if (virtualKeyboardEligible) {
        if (!virtualOpen && isInsight && mobileThreadComposerExpanded) {
          if (!value.trim() && !replyingTo && !editingMessage) {
            setMobileThreadComposerExpanded(false);
            setThreadComposerFocused(false);
            if (keyboardMode === 'system') {
              restoreVirtualKeyboardMode();
            }
          }
        }
        return;
      }
      const prev = previousKeyboardInsetRef.current;
      previousKeyboardInsetRef.current = keyboardInsetPx;
      if (prev > 32 && keyboardInsetPx <= 8 && isInsight && mobileThreadComposerExpanded) {
        taRef.current?.blur();
        setMobileThreadComposerExpanded(false);
        setThreadComposerFocused(false);
      }
    }, [
      keyboardInsetPx,
      isInsight,
      mobileThreadComposerExpanded,
      virtualKeyboardEligible,
      virtualOpen,
      keyboardMode,
      restoreVirtualKeyboardMode,
      value,
      replyingTo,
      editingMessage,
    ]);

    useEffect(() => {
      if (isInsight && replyingTo) {
        flushSync(() => {
          setMobileThreadComposerExpanded(true);
        });
        if (useCustomVirtualKb) {
          openVirtualKeyboard();
          setThreadComposerFocused(true);
        } else if (keyboardMode === 'system') {
          requestAnimationFrame(() => taRef.current?.focus({ preventScroll: true }));
        }
      }
    }, [replyingTo, isInsight, useCustomVirtualKb, keyboardMode, openVirtualKeyboard]);

    useEffect(() => {
      if (isInsight && emojiOpen && !virtualKeyboardEligible) {
        setMobileThreadComposerExpanded(true);
      }
    }, [emojiOpen, isInsight, virtualKeyboardEligible]);

    useEffect(() => {
      if (threadComposerFocused) setComposerSurfacePrimed(false);
    }, [threadComposerFocused]);

    useEffect(() => {
      if (!mobileThreadComposerExpanded) setComposerSurfacePrimed(false);
    }, [mobileThreadComposerExpanded]);

    useLayoutEffect(() => {
      if (!isInsight || !mobileThreadComposerExpanded || useCustomVirtualKb) return;
      taRef.current?.focus({ preventScroll: true });
    }, [isInsight, mobileThreadComposerExpanded, useCustomVirtualKb]);

    useLayoutEffect(() => {
      if (!isInsight || (useCustomVirtualKb && virtualOpen)) return;
      const root = insightMeasureRef.current;
      if (!root) return;
      const prop = ORDERFLOW_FEED_COMMENTS_COMPOSER_HEIGHT_CSS_VAR;
      const apply = () => {
        const footer = root.closest('[aria-label="Messages"]');
        const measured = footer ?? root;
        const h = Math.ceil(measured.getBoundingClientRect().height);
        document.documentElement.style.setProperty(prop, `${Math.max(h, 1)}px`);
      };
      apply();
      const ro = new ResizeObserver(apply);
      ro.observe(root);
      const footer = root.closest('[aria-label="Messages"]');
      if (footer instanceof HTMLElement) ro.observe(footer);
      return () => {
        ro.disconnect();
        document.documentElement.style.removeProperty(prop);
      };
    }, [
      isInsight,
      value,
      emojiOpen,
      replyingTo,
      editingMessage,
      insightMultiline,
      mobileThreadComposerExpanded,
      commentsPageComposerLiftPx,
      useCustomVirtualKb,
      virtualOpen,
    ]);

    useLayoutEffect(() => {
      if (!isInsight || !useCustomVirtualKb || !virtualOpen) return;
      const prop = ORDERFLOW_FEED_COMMENTS_COMPOSER_HEIGHT_CSS_VAR;
      document.documentElement.style.setProperty(
        prop,
        `${Math.max(virtualHeightPx, 1)}px`,
      );
      return () => {
        document.documentElement.style.removeProperty(prop);
      };
    }, [isInsight, useCustomVirtualKb, virtualOpen, virtualHeightPx]);

    useEffect(() => {
      if (isInsight) return;
      const ta = taRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }, [value, isInsight]);

    const syncInsightTextareaSize = useCallback(
      (t: HTMLTextAreaElement, stackCompact = false) => {
        const fontSize = parseFloat(getComputedStyle(t).fontSize) || 14;
        const rawLh = getComputedStyle(t).lineHeight;
        const lineHeightPx =
          rawLh === "normal"
            ? Math.ceil(fontSize * (stackCompact ? 1.286 : 1.35))
            : Math.ceil(parseFloat(rawLh) || (stackCompact ? 18 : 20));

        t.style.height = "0px";
        const scrollH = t.scrollHeight;
        const maxMultilineH = stackCompact ? 90 : 96;
        const multiline = scrollH > lineHeightPx + (stackCompact ? 2 : 6);

        const nextH = Math.min(Math.max(scrollH, lineHeightPx), maxMultilineH);
        t.style.height = `${nextH}px`;
        t.style.maxHeight = `${maxMultilineH}px`;
        t.style.minHeight = `${lineHeightPx}px`;
        t.style.overflowY = scrollH > maxMultilineH ? "auto" : "hidden";
        t.style.overflowX = stackCompact && !multiline ? "auto" : "hidden";
        setInsightMultiline(multiline);
      },
      [],
    );

    useEffect(() => {
      if (!isInsight) return;
      const stackCompact = useCustomVirtualKb && virtualOpen;
      if (!mobileThreadComposerExpanded && !stackCompact) return;
      const ta = taRef.current;
      if (!ta) return;
      syncInsightTextareaSize(ta, stackCompact);
    }, [
      value,
      isInsight,
      mobileThreadComposerExpanded,
      useCustomVirtualKb,
      virtualOpen,
      insightMultiline,
      syncInsightTextareaSize,
      replyingTo,
      emojiOpen,
    ]);

    useEffect(() => {
      if (!editingMessage) return;
      const text = ((editingMessage.content as { text?: string })?.text ?? "").trimEnd();
      flushSync(() => {
        setValue(text);
        setInsightMultiline(false);
        setEmojiOpen(false);
        if (isInsight) {
          setMobileThreadComposerExpanded(true);
          setComposerSurfacePrimed(true);
        }
      });
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (!ta) return;
        if (isInsight) {
          syncInsightTextareaSize(ta, useCustomVirtualKb && virtualOpen);
        }
        const len = ta.value.length;
        ta.setSelectionRange(len, len);
        if (useCustomVirtualKb) {
          openVirtualKeyboard();
          setThreadComposerFocused(true);
        } else if (keyboardMode === 'system') {
          ta.focus({ preventScroll: true });
        } else {
          ta.focus({ preventScroll: true });
        }
      });
    }, [editingMessage, isInsight, syncInsightTextareaSize, useCustomVirtualKb, keyboardMode, openVirtualKeyboard]);

    const focusComposer = useCallback(() => {
      if (disabled) return;
      void resumeInsightKeyboardAudio();
      if (!mobileThreadComposerExpanded) {
        flushSync(() => {
          setComposerSurfacePrimed(true);
          setMobileThreadComposerExpanded(true);
        });
      } else if (compact) {
        setComposerSurfacePrimed(true);
      }
      if (keyboardMode === 'system') {
        setThreadComposerFocused(true);
        requestAnimationFrame(() => {
          const ta = taRef.current;
          if (!ta) return;
          syncCaretFromTextarea();
          ta.focus({ preventScroll: true });
        });
        return;
      }
      if (useCustomVirtualKb) {
        openVirtualKeyboard();
        setThreadComposerFocused(true);
        requestAnimationFrame(() => {
          const ta = taRef.current;
          if (!ta) return;
          ta.focus({ preventScroll: true });
          setCaret(ta.value.length, ta.value.length);
        });
        return;
      }
      requestAnimationFrame(() => {
        taRef.current?.focus({ preventScroll: true });
      });
    }, [
      disabled,
      mobileThreadComposerExpanded,
      compact,
      keyboardMode,
      useCustomVirtualKb,
      openVirtualKeyboard,
      syncCaretFromTextarea,
      setCaret,
    ]);

    const onComposerPillPointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (disabled || e.button !== 0) return;
        e.preventDefault();
        void resumeInsightKeyboardAudio();
        focusComposer();
      },
      [disabled, focusComposer],
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      if (isInsight) {
        syncInsightTextareaSize(e.target, useCustomVirtualKb && virtualOpen);
      }
      onTyping?.(true);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => onTyping?.(false), 1500);
    };

    const submit = async () => {
      const text = value.trim();
      if (!text || disabled) return;

      if (editingMessage) {
        const original = ((editingMessage.content as { text?: string })?.text ?? "").trim();
        setValue("");
        setInsightMultiline(false);
        setEmojiOpen(false);
        if (isInsight) {
          setMobileThreadComposerExpanded(false);
          if (useCustomVirtualKb) {
            closeVirtualKeyboard();
            setThreadComposerFocused(false);
          } else if (keyboardMode === 'system') {
            taRef.current?.blur();
            setThreadComposerFocused(false);
          }
        }
        try {
          if (text !== original) {
            await onSaveEdit?.(text);
          }
          onCancelEdit?.();
        } catch (err) {
          console.warn("[ps-composer] edit save failed", err);
          setValue(text);
        }
        return;
      }

      setValue("");
      setInsightMultiline(false);
      setEmojiOpen(false);
      if (isInsight) {
        setMobileThreadComposerExpanded(false);
        if (useCustomVirtualKb) {
          closeVirtualKeyboard();
          setThreadComposerFocused(false);
        } else if (keyboardMode === 'system') {
          taRef.current?.blur();
          setThreadComposerFocused(false);
        }
      }
      try {
        await onSend(text, replyingTo?.id ?? null);
        onCancelReply?.();
      } catch (err) {
        console.warn("[ps-composer] send failed", err);
      }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (useCustomVirtualKb && virtualOpen && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void submit();
      }
    };

    const iconBtn = isInsight
      ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0"
      : "ps-btn-icon ps-btn-ghost";

    const insightPillClass = insightMultiline
      ? "rounded-2xl items-end py-1.5"
      : "rounded-full items-center py-1";

    const threadToolbarIconBtnClass =
      "flex shrink-0 items-center justify-center rounded-md px-1.5 py-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-300";

    const composerPlaceholder = editingMessage
      ? "Edit message…"
      : replyingTo
        ? "Add your reply…"
        : isInsight
          ? "Message"
          : "Add a comment…";

    const collapsedComposerPillLabel = useMemo(() => {
      const t = value.trim();
      if (!t) return composerPlaceholder;
      return t.length > 140 ? `${t.slice(0, 140)}…` : t;
    }, [value, composerPlaceholder]);

    const editStrip = (
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={cn(
              "mx-0 mb-2 flex items-center gap-2 overflow-hidden px-2 py-1.5",
              isInsight
                ? "rounded-xl border bg-background/35"
                : "liquid-glass--inset mx-1",
            )}
            style={
              isInsight
                ? {
                    borderColor: "var(--insight-gold)",
                    boxShadow: "inset 3px 0 0 0 var(--insight-gold)",
                  }
                : { borderRadius: 10 }
            }
          >
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide",
                isInsight ? undefined : undefined,
              )}
              style={
                isInsight
                  ? { color: "var(--insight-gold)" }
                  : { fontSize: 11, color: "var(--ps-gold, var(--ps-green))", fontWeight: 600 }
              }
            >
              <PencilSimple size={12} weight="bold" aria-hidden />
              Editing
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                isInsight ? "text-muted-foreground" : undefined,
              )}
              style={
                isInsight
                  ? undefined
                  : { fontSize: 12, color: "var(--ps-text-tertiary)" }
              }
            >
              {(editingMessage.content as { text?: string })?.text ?? "[message]"}
            </span>
            <button
              type="button"
              onClick={() => {
                setValue("");
                setInsightMultiline(false);
                setEmojiOpen(false);
                if (isInsight) setMobileThreadComposerExpanded(false);
                onCancelEdit?.();
              }}
              className={cn(
                isInsight
                  ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0"
                  : "ps-btn-ghost",
              )}
              style={isInsight ? undefined : { width: 20, height: 20, padding: 0 }}
              aria-label="Cancel edit"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );

    const replyStrip = (
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "mx-0 mb-2 flex items-center gap-2 px-2 py-1.5",
              isInsight
                ? "rounded-xl border border-border/50 bg-background/35"
                : "liquid-glass--inset mx-1",
            )}
            style={isInsight ? undefined : { borderRadius: 10 }}
          >
            <span
              className={cn(
                "text-[11px] font-semibold",
                isInsight ? "text-emerald-600 dark:text-emerald-400" : undefined,
              )}
              style={
                isInsight
                  ? undefined
                  : { fontSize: 11, color: "var(--ps-green)", fontWeight: 600 }
              }
            >
              Reply
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                isInsight ? "text-muted-foreground" : undefined,
              )}
              style={
                isInsight
                  ? undefined
                  : { fontSize: 12, color: "var(--ps-text-tertiary)" }
              }
            >
              {(replyingTo.content as { text?: string })?.text ?? "[message]"}
            </span>
            <button
              type="button"
              onClick={onCancelReply}
              className={cn(
                isInsight
                  ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0"
                  : "ps-btn-ghost",
              )}
              style={isInsight ? undefined : { width: 20, height: 20, padding: 0 }}
              aria-label="Cancel reply"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );

    const createSignalButton =
      canCreateSignal && onOpenCreateSignal ? (
        <button
          type="button"
          className={cn(
            "ps-insight-composer-icon-btn shrink-0 inline-flex items-center justify-center gap-1",
            inVirtualStack
              ? "h-7 w-7 min-h-0 p-0.5"
              : "h-11 min-h-[2.75rem] px-2 sm:px-2.5",
            INSIGHT_FOCUS_RING,
          )}
          style={{ color: "var(--insight-gold)" }}
          aria-label="Create signal"
          onPointerDown={(e) => {
            e.stopPropagation();
            if (disabled) return;
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            taRef.current?.blur();
            onOpenCreateSignal();
          }}
        >
          <Lightning size={inVirtualStack ? 16 : 18} weight="fill" />
          <span className="hidden sm:inline text-xs font-semibold">Create</span>
        </button>
      ) : null;

    const insightComposerRow = (
      <motion.form
        layout={!inVirtualStack}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        onPointerDownCapture={(e) => {
          if (disabled) return;
          const t = e.target;
          if (!(t instanceof Element)) return;
          if (t.closest("button")) return;
          const ta = taRef.current;
          if (!ta || t === ta) return;
          ta.focus({ preventScroll: true });
        }}
        className={cn(
          "relative z-[1] flex w-full min-w-0 flex-col overflow-x-hidden border-0 bg-transparent px-2 md:px-3",
          inVirtualStack ? "gap-1 py-0" : "gap-2",
        )}
      >
        <motion.div
          layout={!inVirtualStack}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className={cn(
            "relative z-[1] flex w-full min-w-0 gap-2",
            inVirtualStack
              ? insightMultiline
                ? "items-end"
                : "items-center"
              : "items-end",
          )}
        >
          <div
            className={cn(
              "ps-insight-composer-shell",
              inVirtualStack && "ps-insight-composer-shell--compact",
              inVirtualStack && insightMultiline && "ps-insight-composer-shell--multiline",
              insightMultiline ? "items-end" : "items-center",
              inVirtualStack && !insightMultiline
                ? "rounded-full items-center"
                : insightPillClass,
            )}
          >
            <button
              type="button"
              className="ps-insight-composer-icon-btn"
              aria-label="Attach"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                const fileInput = document.querySelector<HTMLInputElement>("#ps-media-upload");
                fileInput?.click();
                requestAnimationFrame(() => {
                  taRef.current?.focus({ preventScroll: true });
                });
              }}
            >
              <Plus size={inVirtualStack ? 18 : 20} weight="bold" />
            </button>

            <label className="relative z-[1] flex min-h-0 min-w-0 flex-1 cursor-text flex-col">
              <textarea
                ref={taRef}
                dir="ltr"
                value={value}
                onChange={handleChange}
                onInput={(e) => {
                  syncInsightTextareaSize(e.currentTarget, inVirtualStack);
                }}
                onKeyDown={onKeyDown}
                onFocus={() => {
                  setThreadComposerFocused(true);
                  if (keyboardMode === 'system') {
                    syncCaretFromTextarea();
                    return;
                  }
                  if (useCustomVirtualKb) {
                    openVirtualKeyboard();
                    requestAnimationFrame(() => {
                      const ta = taRef.current;
                      if (!ta) return;
                      const pos = ta.value.length;
                      setCaret(pos, pos);
                    });
                    return;
                  }
                  syncCaretFromTextarea();
                }}
                onBlur={() => {
                  if (useCustomVirtualKb && virtualOpen) return;
                  requestAnimationFrame(() => {
                    setThreadComposerFocused(false);
                  });
                }}
                onSelect={syncCaretFromTextarea}
                onClick={syncCaretFromTextarea}
                readOnly={useCustomVirtualKb && !virtualOpen}
                inputMode={useCustomVirtualKb ? "none" : undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={disabled}
                placeholder={disabled ? disabledReason ?? "Cannot send" : composerPlaceholder}
                rows={1}
                enterKeyHint="send"
                className={cn(
                  "ps-insight-composer-textarea",
                  inVirtualStack &&
                    !insightMultiline &&
                    "ps-insight-composer-textarea--stack-single",
                  inVirtualStack &&
                    insightMultiline &&
                    "ps-insight-composer-textarea--stack-multiline",
                  virtualOpen && useCustomVirtualKb && "ps-insight-composer-textarea--virtual-focus",
                )}
              />
            </label>

            {!virtualKeyboardEligible ? (
              <button
                type="button"
                className="ps-insight-composer-icon-btn"
                aria-label="Emoji"
                onClick={() => {
                  setEmojiOpen((v) => !v);
                  requestAnimationFrame(() => {
                    taRef.current?.focus({ preventScroll: true });
                  });
                }}
              >
                <Smiley size={20} />
              </button>
            ) : null}
          </div>

          {createSignalButton}

          <AnimatePresence initial={false}>
            {(value.trim() || editingMessage) && (
              <motion.button
                key={editingMessage ? "ps-insight-save" : "ps-insight-send"}
                type="submit"
                disabled={disabled || !value.trim()}
                initial={
                  inVirtualStack
                    ? { scale: 0.6, opacity: 0 }
                    : { scale: 0.6, opacity: 0, width: 0, marginLeft: 0 }
                }
                animate={
                  inVirtualStack
                    ? { scale: 1, opacity: 1 }
                    : { scale: 1, opacity: 1, width: 48, marginLeft: 0 }
                }
                exit={
                  inVirtualStack
                    ? { scale: 0.6, opacity: 0 }
                    : { scale: 0.6, opacity: 0, width: 0, marginLeft: 0 }
                }
                transition={{ type: "spring", stiffness: 480, damping: 30 }}
                className={cn(
                  "ps-insight-send-btn",
                  inVirtualStack && "ps-insight-send-btn--compact",
                )}
                aria-label={editingMessage ? "Save edit" : "Send"}
                style={
                  editingMessage
                    ? { background: "var(--insight-gold)", color: "var(--insight-canvas-bg, #0a0a0a)" }
                    : undefined
                }
              >
                {editingMessage ? (
                  <Check size={inVirtualStack ? 16 : 20} weight="bold" />
                ) : (
                  <PaperPlaneRight
                    size={inVirtualStack ? 16 : 20}
                    weight="fill"
                  />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.form>
    );

    const patternComposerRow = (
      <div className="flex items-end gap-1.5 px-1">
        <button
          type="button"
          className={iconBtn}
          aria-label="Attach"
          onClick={() => {
            const fileInput = document.querySelector<HTMLInputElement>("#ps-media-upload");
            fileInput?.click();
          }}
        >
          <Paperclip size={18} />
        </button>

        <div className="relative min-w-0 flex-1">
          <textarea
            ref={taRef}
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={disabled ? disabledReason ?? "Cannot send" : "Message..."}
            className="ps-input"
            rows={1}
            style={{
              height: 44,
              padding: "10px 12px",
              resize: "none",
              minHeight: 44,
              maxHeight: 160,
            }}
          />
        </div>

        <button
          type="button"
          className={iconBtn}
          aria-label="Emoji"
          onClick={() => setEmojiOpen((v) => !v)}
        >
          <Smiley size={18} />
        </button>

        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || !value.trim()}
          className="ps-btn ps-btn-primary"
          style={{ height: 44, width: 44, padding: 0, borderRadius: 12 }}
          aria-label={editingMessage ? "Save edit" : "Send"}
        >
          {editingMessage ? (
            <Check size={18} weight="bold" />
          ) : (
            <PaperPlaneRight size={18} weight="fill" />
          )}
        </button>
      </div>
    );

    const emojiPanel = (
      <AnimatePresence>
        {emojiOpen && !virtualKeyboardEligible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className={cn(
              "mt-2 grid grid-cols-8 gap-1 p-2",
              isInsight
                ? "rounded-xl border border-border/50 bg-background/40"
                : "liquid-glass mx-1",
            )}
            style={isInsight ? undefined : { borderRadius: 14 }}
          >
            {QUICK_EMOJI_PALETTE.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setValue((v) => v + e);
                  setEmojiOpen(false);
                  if (isInsight) {
                    requestAnimationFrame(() => {
                      taRef.current?.focus({ preventScroll: true });
                    });
                  }
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  isInsight ? "hover:bg-background/50" : "hover:bg-white/10",
                )}
                style={{ fontSize: 20 }}
              >
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );

    const insightExpandedInner = (
      <>
        {editStrip}
        {replyStrip}
        <LayoutGroup id="ps-insight-msg-composer">
          <div style={threadComposerKeyboardScrollStyle}>
            {insightComposerRow}
            {emojiPanel}
          </div>
        </LayoutGroup>
      </>
    );

    const insightStackComposerSlot = (
      <>
        {editStrip}
        {replyStrip}
        <LayoutGroup id="ps-insight-msg-composer-stack">{insightComposerRow}</LayoutGroup>
      </>
    );

    const inner = (
      <>
        {editStrip}
        {replyStrip}
        {patternComposerRow}
        {emojiPanel}
      </>
    );

    if (isInsight && typeof document !== "undefined") {
      const barLiftPx = commentsPageComposerLiftPx;
      const composerLiftTransition =
        barLiftPx > 0
          ? "transition-none"
          : "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]";
      const orderflowFooter = (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-[1220] md:right-[4.5rem]",
            composerLiftTransition,
            barLiftPx > 0
              ? "rounded-none border-0 bg-transparent pb-0 shadow-none outline-none ring-0"
              : "rounded-none border-t border-border/40 bg-transparent pb-0 shadow-none",
          )}
          style={{
            transform: barLiftPx > 0 ? `translateY(${-barLiftPx}px)` : "translateY(0)",
          }}
          aria-label="Messages"
        >
          <div
            className={cn(
              feedCommentsComposerSlotBaseClass,
              barLiftPx > 0 ? "!mx-0 !max-w-none !w-full !p-0 !pt-0 !pb-0 !pl-0 !pr-0 min-h-0" : "pt-1",
              !barLiftPx && "pb-[env(safe-area-inset-bottom,0px)]",
            )}
          >
            <div ref={insightMeasureRef} className="flex w-full min-w-0 flex-col gap-0 bg-transparent">
              <div className="flex min-w-0 w-full items-end gap-2 px-2 md:px-3">
                {mobileThreadComposerExpanded && !(useCustomVirtualKb && virtualOpen) ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-0 overflow-x-hidden">
                    <div
                      className={cn(
                        feedCommentsMobileBarGlassExpandedClass,
                        standaloneDisplay && feedCommentsMobileBarGlassExpandedStandaloneClass,
                      )}
                    >
                      {insightExpandedInner}
                    </div>
                  </div>
                ) : useCustomVirtualKb && virtualOpen ? null : createSignalButton ? (
                  <>
                    <button
                      type="button"
                      className={cn(
                        feedCommentsMobileBarGlassPillCollapsedClass,
                        standaloneDisplay && feedCommentsMobileBarGlassPillStandaloneClass,
                        value.trim() && "text-foreground",
                        "!w-auto !min-w-0 !max-w-none min-h-[2.75rem] flex-1 self-stretch shrink",
                      )}
                      onPointerDown={onComposerPillPointerDown}
                    >
                      <span className="block min-w-0 flex-1 truncate text-left leading-snug">
                        {collapsedComposerPillLabel}
                      </span>
                    </button>
                    {createSignalButton}
                  </>
                ) : (
                  <div className="flex min-w-0 flex-1 justify-center">
                    <button
                      type="button"
                      className={cn(
                        feedCommentsMobileBarGlassPillCollapsedClass,
                        standaloneDisplay && feedCommentsMobileBarGlassPillStandaloneClass,
                        value.trim() && "text-foreground",
                      )}
                      onPointerDown={onComposerPillPointerDown}
                    >
                      <span className="block min-w-0 flex-1 truncate text-left leading-snug">
                        {collapsedComposerPillLabel}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );

      return (
        <>
          {createPortal(orderflowFooter, document.body)}
          {useCustomVirtualKb ? (
            <InsightChatInputStack
              open={virtualOpen}
              composerSlot={insightStackComposerSlot}
              onStackHeightChange={onVirtualHeightChange}
            >
              <InsightIOSVirtualKeyboard
                embedded
                open={virtualOpen}
                onInsert={insertAtCursor}
                onPasteText={pasteAtCursor}
                onBackspace={backspaceAtCursor}
                onSubmit={() => void submit()}
                returnKeyMode="send"
                initialLayout={vkLayoutRequest}
                onInitialLayoutConsumed={clearLayoutRequest}
                onUseSystemKeyboard={handleUseSystemKeyboard}
              />
            </InsightChatInputStack>
          ) : null}
        </>
      );
    }

    return (
      <div
        className="sticky bottom-0 liquid-glass"
        style={{
          zIndex: 300,
          borderRadius: 0,
          padding: "8px 8px calc(env(safe-area-inset-bottom, 0px) + 8px)",
          borderBottom: "none",
          borderLeft: "none",
          borderRight: "none",
        }}
      >
        {inner}
      </div>
    );
  },
);

const QUICK_EMOJI_PALETTE = [
  "😀", "😂", "🥲", "😎", "😍", "🤩", "🤔", "🙏",
  "👍", "👏", "🔥", "💯", "✅", "❌", "💸", "📈",
  "📉", "🎯", "💎", "🚀", "💰", "🟢", "🔴", "⚡",
];

MessageComposer.displayName = "MessageComposer";
