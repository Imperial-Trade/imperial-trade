import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import {
  loadInsightKeyboardMode,
  persistInsightKeyboardMode,
  type InsightKeyboardMode,
} from '@/insight/insightIOSKeyboardBridge';

function isTouchIPad(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/** Phone, tablet, or touch iPad — not desktop mouse/trackpad. */
export function useInsightVirtualKeyboardEligible(enabled: boolean): boolean {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setEligible(false);
      return;
    }
    const touchIPad = isTouchIPad();
    const finePointerDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches &&
      !touchIPad;
    setEligible((isMobile || isTablet || touchIPad) && !finePointerDesktop);
  }, [enabled, isMobile, isTablet]);

  return eligible;
}

async function hideNativeKeyboard(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.hide();
  } catch {
    /* web / plugin unavailable */
  }
}

export type UseInsightVirtualComposerKeyboardOptions = {
  enabled: boolean;
  value: string;
  setValue: (next: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onTyping?: (typing: boolean) => void;
  typingTimerRef: React.MutableRefObject<number | null>;
};

export function useInsightVirtualComposerKeyboard({
  enabled,
  value,
  setValue,
  textareaRef,
  onTyping,
  typingTimerRef,
}: UseInsightVirtualComposerKeyboardOptions) {
  const virtualKeyboardEligible = useInsightVirtualKeyboardEligible(enabled);
  const [keyboardMode, setKeyboardMode] = useState<InsightKeyboardMode>('virtual');
  const [virtualOpen, setVirtualOpen] = useState(false);
  const [virtualHeightPx, setVirtualHeightPx] = useState(0);
  const [vkLayoutRequest, setVkLayoutRequest] = useState<'letters' | 'emoji' | null>(null);
  const caretIndexRef = useRef(0);
  const virtualOpenRef = useRef(false);

  const useCustomVirtualKb = virtualKeyboardEligible && keyboardMode === 'virtual';

  useEffect(() => {
    virtualOpenRef.current = virtualOpen;
  }, [virtualOpen]);

  useEffect(() => {
    if (!enabled) return;
    void loadInsightKeyboardMode().then(setKeyboardMode);
  }, [enabled]);

  useEffect(() => {
    caretIndexRef.current = Math.min(caretIndexRef.current, value.length);
  }, [value]);

  const applyCaretToTextarea = useCallback(
    (clamped: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      if (virtualOpenRef.current) {
        if (document.activeElement !== ta) {
          ta.focus({ preventScroll: true });
        }
      }
      ta.setSelectionRange(clamped, clamped);
    },
    [textareaRef],
  );

  const setCaret = useCallback(
    (pos: number, textLength?: number) => {
      const len =
        textLength ??
        textareaRef.current?.value.length ??
        value.length;
      const clamped = Math.max(0, Math.min(pos, len));
      caretIndexRef.current = clamped;
      applyCaretToTextarea(clamped);
    },
    [textareaRef, value.length, applyCaretToTextarea],
  );

  const syncCaretFromTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? caretIndexRef.current;
    caretIndexRef.current = start;
    if (virtualOpenRef.current && document.activeElement === ta) {
      const end = ta.selectionEnd ?? start;
      if (start === end) {
        ta.setSelectionRange(start, end);
      }
    }
  }, [textareaRef]);

  const getCaretRange = useCallback(() => {
    const ta = textareaRef.current;
    if (ta && document.activeElement === ta && ta.selectionStart != null) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd ?? start;
      caretIndexRef.current = start;
      return { start, end };
    }
    // Fallback when textarea selection is unavailable (e.g. inputMode="none" quirks).
    const pos = caretIndexRef.current;
    return { start: pos, end: pos };
  }, [textareaRef]);

  const open = useCallback(() => {
    if (!useCustomVirtualKb) return;
    virtualOpenRef.current = true;
    setVirtualOpen(true);
    void hideNativeKeyboard();
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = Math.min(caretIndexRef.current, ta.value.length);
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(pos, pos);
      caretIndexRef.current = pos;
    });
  }, [useCustomVirtualKb, textareaRef]);

  const close = useCallback(() => {
    virtualOpenRef.current = false;
    setVirtualOpen(false);
    setVirtualHeightPx(0);
    setVkLayoutRequest(null);
  }, []);

  const useSystemKeyboard = useCallback(() => {
    close();
    setKeyboardMode('system');
    void persistInsightKeyboardMode('system');
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = Math.min(caretIndexRef.current, ta.value.length);
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(pos, pos);
      caretIndexRef.current = pos;
    });
  }, [close, textareaRef]);

  const restoreVirtualKeyboardMode = useCallback(() => {
    setKeyboardMode('virtual');
    void persistInsightKeyboardMode('virtual');
  }, []);

  const useVirtualKeyboard = useCallback(() => {
    restoreVirtualKeyboardMode();
    open();
  }, [open, restoreVirtualKeyboardMode]);

  const notifyTyping = useCallback(() => {
    onTyping?.(true);
    if (typingTimerRef.current != null) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => onTyping?.(false), 1500);
  }, [onTyping, typingTimerRef]);

  const insertAtCursor = useCallback(
    (text: string) => {
      const { start, end } = getCaretRange();
      const next = value.slice(0, start) + text + value.slice(end);
      const newCaret = start + text.length;
      caretIndexRef.current = newCaret;
      flushSync(() => {
        setValue(next);
      });
      applyCaretToTextarea(newCaret);
      notifyTyping();
    },
    [value, setValue, getCaretRange, applyCaretToTextarea, notifyTyping],
  );

  const backspaceAtCursor = useCallback(() => {
    const { start, end } = getCaretRange();
    if (start !== end) {
      const next = value.slice(0, start) + value.slice(end);
      caretIndexRef.current = start;
      flushSync(() => {
        setValue(next);
      });
      applyCaretToTextarea(start);
      notifyTyping();
      return;
    }
    if (start <= 0) return;
    const next = value.slice(0, start - 1) + value.slice(start);
    const newCaret = start - 1;
    caretIndexRef.current = newCaret;
    flushSync(() => {
      setValue(next);
    });
    applyCaretToTextarea(newCaret);
    notifyTyping();
  }, [value, setValue, getCaretRange, applyCaretToTextarea, notifyTyping]);

  const pasteAtCursor = useCallback(
    (text: string) => {
      if (!(text ?? '').trim()) return;
      insertAtCursor(text);
    },
    [insertAtCursor],
  );

  const requestEmojiLayout = useCallback(() => {
    setVkLayoutRequest('emoji');
    open();
  }, [open]);

  const clearLayoutRequest = useCallback(() => {
    setVkLayoutRequest(null);
  }, []);

  const onVirtualHeightChange = useCallback((px: number) => {
    setVirtualHeightPx(px);
  }, []);

  return {
    virtualKeyboardEligible,
    keyboardMode,
    useCustomVirtualKb,
    virtualOpen,
    virtualHeightPx,
    vkLayoutRequest,
    open,
    close,
    useSystemKeyboard,
    useVirtualKeyboard,
    restoreVirtualKeyboardMode,
    syncCaretFromTextarea,
    setCaret,
    insertAtCursor,
    backspaceAtCursor,
    pasteAtCursor,
    requestEmojiLayout,
    clearLayoutRequest,
    onVirtualHeightChange,
  };
}
