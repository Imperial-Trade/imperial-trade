export type PopoverLayoutInput = {
  keyRect: DOMRect;
  popoverWidth: number;
  safeMargin?: number;
  /** Optional centered column bounds (e.g. max-w-lg stack). */
  columnRect?: DOMRect | null;
};

export type PopoverLayout = {
  /** Left edge of popover in viewport px. */
  left: number;
  /** Top edge anchor (key top); popover uses translateY(-100%). */
  top: number;
  /** Horizontal offset from popover center to key center (for stem). */
  stemOffsetX: number;
  width: number;
};

/**
 * iOS-style popover placement: clamp bubble inside viewport/column while
 * keeping the stem rooted to the pressed key center.
 */
export function computeKeyboardPopoverLayout({
  keyRect,
  popoverWidth,
  safeMargin = 8,
  columnRect = null,
}: PopoverLayoutInput): PopoverLayout {
  const keyCenterX = keyRect.left + keyRect.width / 2;
  const idealLeft = keyCenterX - popoverWidth / 2;

  let minLeft = safeMargin;
  let maxLeft =
    (typeof window !== 'undefined' ? window.innerWidth : keyRect.right) -
    popoverWidth -
    safeMargin;

  if (columnRect) {
    minLeft = Math.max(minLeft, columnRect.left + safeMargin);
    maxLeft = Math.min(maxLeft, columnRect.right - popoverWidth - safeMargin);
  }

  if (maxLeft < minLeft) {
    maxLeft = minLeft;
  }

  const left = Math.max(minLeft, Math.min(idealLeft, maxLeft));
  const popoverCenterX = left + popoverWidth / 2;
  const stemOffsetX = keyCenterX - popoverCenterX;

  return {
    left,
    top: keyRect.top,
    stemOffsetX,
    width: popoverWidth,
  };
}

/** Width for single-char stem preview above a key. */
export function stemPreviewWidth(
  keyRect: DOMRect,
  kind: 'letter' | 'emoji' = 'letter',
): number {
  if (kind === 'emoji') {
    return Math.max(keyRect.width * 1.55, 56);
  }
  return Math.max(keyRect.width * 1.35, 52);
}

/** Width for long-press alternate character strip. */
export function alternateStripWidth(
  keyRect: DOMRect,
  charCount: number,
): number {
  const perChar = 44;
  const minW = Math.max(keyRect.width * 1.2, 52);
  return Math.max(minW, Math.min(charCount * perChar + 16, 320));
}
