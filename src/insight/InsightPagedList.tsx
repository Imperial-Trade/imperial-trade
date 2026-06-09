import * as React from 'react';
import { cn } from '@/lib/utils';
import { PostListSkeleton } from '@/insight/PostSkeleton';
import { CommentListSkeleton } from '@/insight/CommentSkeleton';

type SkeletonVariant = 'post' | 'comment';

export type InsightPagedListProps<T> = {
  visibleItems: readonly T[];
  hasMore: boolean;
  isAppending: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  skeletonVariant?: SkeletonVariant;
  skeletonCount?: number;
  className?: string;
  children: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => React.Key;
};

/**
 * Renders visible page of items + optional tail skeleton + scroll sentinel.
 * Const + `<T,>` generic avoids Vite/ESM issues with `export function Foo<T>` in `.tsx`.
 */
export const InsightPagedList = <T,>({
  visibleItems,
  hasMore,
  isAppending,
  sentinelRef,
  skeletonVariant = 'post',
  skeletonCount = 8,
  className,
  children,
  getKey,
}: InsightPagedListProps<T>) => {
  const skeleton =
    skeletonVariant === 'comment' ? (
      <CommentListSkeleton count={Math.min(skeletonCount, 8)} />
    ) : (
      <PostListSkeleton count={Math.min(skeletonCount, 8)} />
    );

  return (
    <div className={cn('space-y-4', className)}>
      {visibleItems.map((item, index) => (
        <React.Fragment key={getKey(item, index)}>
          {children(item, index)}
        </React.Fragment>
      ))}
      {hasMore && isAppending ? skeleton : null}
      {hasMore ? (
        <div
          ref={sentinelRef}
          className="h-4 w-full shrink-0"
          aria-hidden
        />
      ) : null}
    </div>
  );
};
