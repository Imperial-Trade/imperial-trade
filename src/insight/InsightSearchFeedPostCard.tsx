import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Heart } from 'lucide-react';
import type { Post } from '@/insight/insightPost';
import { openInsightCommunityComments } from '@/insight/insightCommunityLinks';
import { cn } from '@/lib/utils';

function clipText(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function InsightSearchFeedPostCard({ post }: { post: Post }) {
  const author =
    post.author.display_name?.trim() ||
    post.author.real_name?.trim() ||
    'Trader';

  return (
    <button
      type="button"
      onClick={() => openInsightCommunityComments(post.id)}
      className={cn(
        'w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-left shadow-sm',
        'backdrop-blur-sm transition-colors hover:bg-muted/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0'
      )}
    >
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
          {post.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {clipText(post.content, 180)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/90">{author}</span>
          <span className="tabular-nums">
            {formatDistanceToNow(post.createdAt, { addSuffix: true })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 opacity-80" aria-hidden />
            {post.likes}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5 opacity-80" aria-hidden />
            {post.comments}
          </span>
        </div>
      </div>
    </button>
  );
}
