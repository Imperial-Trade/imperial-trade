import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const DEFAULT_PAGE = 8;
const SKELETON_MIN_MS = 280;
const SKELETON_MAX_MS = 420;

export type UseScrollPagedListOptions<T> = {
  items: readonly T[];
  pageSize?: number;
  enabled?: boolean;
  /**
   * When this value changes (e.g. feed tab), reset visible window and append lock
   * so paging does not carry over stale state for same-length lists.
   */
  resetKey?: string | number;
  /** IntersectionObserver root (e.g. scroll container); null = viewport */
  root?: Element | null;
  rootMargin?: string;
};

export function useScrollPagedList<T>({
  items,
  pageSize = DEFAULT_PAGE,
  enabled = true,
  resetKey,
  root = null,
  rootMargin = '120px 0px 0px 0px',
}: UseScrollPagedListOptions<T>) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(pageSize, items.length)
  );
  const [isAppending, setIsAppending] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const appendLock = useRef(false);
  const itemCountRef = useRef(items.length);
  const prevResetKeyRef = useRef<typeof resetKey>(undefined);

  useEffect(() => {
    if (resetKey === undefined) {
      prevResetKeyRef.current = undefined;
      return;
    }
    if (prevResetKeyRef.current === undefined) {
      prevResetKeyRef.current = resetKey;
      return;
    }
    if (prevResetKeyRef.current === resetKey) return;
    prevResetKeyRef.current = resetKey;
    itemCountRef.current = items.length;
    setVisibleCount(Math.min(pageSize, items.length));
    setIsAppending(false);
    appendLock.current = false;
  }, [resetKey, items.length, pageSize]);

  useEffect(() => {
    if (items.length !== itemCountRef.current) {
      itemCountRef.current = items.length;
      setVisibleCount((c) => Math.min(Math.max(c, pageSize), items.length));
    }
  }, [items.length, pageSize]);

  useEffect(() => {
    setVisibleCount((c) => Math.min(c, items.length));
  }, [items.length]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const hasMore = visibleCount < items.length;

  const revealMore = useCallback(() => {
    if (!enabled || !hasMore || appendLock.current) return;
    appendLock.current = true;
    setIsAppending(true);
    const delay =
      SKELETON_MIN_MS +
      Math.random() * (SKELETON_MAX_MS - SKELETON_MIN_MS);
    window.setTimeout(() => {
      setVisibleCount((c) => Math.min(c + pageSize, items.length));
      setIsAppending(false);
      appendLock.current = false;
    }, delay);
  }, [enabled, hasMore, pageSize, items.length]);

  useEffect(() => {
    if (!enabled || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) revealMore();
      },
      { root, rootMargin, threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled, hasMore, revealMore, root, rootMargin]);

  const reset = useCallback(() => {
    setVisibleCount(Math.min(pageSize, items.length));
    setIsAppending(false);
    appendLock.current = false;
  }, [items.length, pageSize]);

  return {
    visibleItems,
    visibleCount,
    hasMore,
    isAppending,
    sentinelRef,
    reset,
    revealMore,
  };
}
