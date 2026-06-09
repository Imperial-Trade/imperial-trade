import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Clock, Play } from 'lucide-react';
import { Video } from '@/api/entities/index';
import AccessDenied from '@/components/AccessDenied';
import VideoPlayer from '@/components/learning/VideoPlayer';
import { categoryMap } from '@/components/learning/constants';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type VideoRecord = {
  id: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  duration?: string;
  category?: string;
  created_date?: string;
};

type VideoGroup = {
  category: string;
  title: string;
  order: number;
  videos: VideoRecord[];
};

function InsightClassroomFeatured({
  video,
  onPlay,
}: {
  video: VideoRecord | null;
  onPlay: (v: VideoRecord) => void;
}) {
  if (!video) {
    return (
      <div
        className={cn(
          'relative h-[220px] w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/30',
          'md:h-[260px] flex items-center justify-center px-6'
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 opacity-60" aria-hidden />
          <p className="text-sm font-medium">Loading featured lesson…</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative h-[220px] w-full shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm',
        'md:h-[260px]'
      )}
    >
      {video.thumbnail_url ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${video.thumbnail_url})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/80 to-background" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/75 to-transparent" />
      <div className="absolute inset-0 z-[1] flex flex-col justify-end p-5 md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Featured
        </p>
        <h2 className="mt-1 line-clamp-2 text-xl font-semibold leading-tight text-foreground md:text-2xl">
          {video.title ?? 'Lesson'}
        </h2>
        {video.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {video.description}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={() => onPlay(video)}
          className="pointer-events-auto mt-4 w-fit gap-2 rounded-full bg-primary text-primary-foreground shadow-sm"
        >
          <Play className="h-4 w-4" aria-hidden />
          Watch now
        </Button>
      </div>
    </motion.div>
  );
}

function InsightClassroomRow({
  title,
  videos,
  onPlay,
}: {
  title: string;
  videos: VideoRecord[];
  onPlay: (v: VideoRecord) => void;
}) {
  if (!videos?.length) return null;

  return (
    <section className="space-y-3 pt-2">
      <h3 className="px-0.5 text-sm font-semibold text-foreground">{title}</h3>
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none]',
          '[&::-webkit-scrollbar]:hidden'
        )}
      >
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onPlay(v)}
            className={cn(
              'min-w-[min(280px,calc(100vw-2.5rem))] shrink-0 text-left',
              'rounded-xl border border-border/50 bg-card/50 shadow-sm',
              'transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0'
            )}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted/40">
              {v.thumbnail_url ? (
                <img
                  src={v.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Play className="h-10 w-10 text-muted-foreground/60" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/25">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md opacity-0 transition-opacity hover:opacity-100">
                  <Play className="h-5 w-5" fill="currentColor" />
                </span>
              </div>
            </div>
            <div className="space-y-1 p-3">
              <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                {v.title}
              </p>
              {v.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {v.description}
                </p>
              ) : null}
              {v.duration ? (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" aria-hidden />
                  {v.duration}
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * Premium video classroom merged into Insight — layout tokens match main column / feed chrome.
 */
export function InsightClassroomView() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [groupedVideos, setGroupedVideos] = useState<VideoGroup[]>([]);
  const [featuredVideo, setFeaturedVideo] = useState<VideoRecord | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const fetched = (await Video.list('-created_date')) as VideoRecord[];
        if (cancelled) return;
        setVideos(fetched);
        if (fetched.length > 0) {
          setFeaturedVideo(fetched[0]);
          const groups = fetched.reduce<Record<string, VideoRecord[]>>(
            (acc, video) => {
              const cat = video.category || 'uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(video);
              return acc;
            },
            {}
          );
          const map = categoryMap as Record<
            string,
            { name: string; order: number }
          >;
          const sortedGroups = Object.keys(groups)
            .map((key) => ({
              category: key,
              title: map[key]?.name ?? 'General',
              order: map[key]?.order ?? 99,
              videos: groups[key],
            }))
            .sort((a, b) => a.order - b.order);
          setGroupedVideos(sortedGroups);
        } else {
          setFeaturedVideo(null);
          setGroupedVideos([]);
        }
      } catch (e) {
        console.error('InsightClassroomView:', e);
        if (!cancelled) {
          setVideos([]);
          setGroupedVideos([]);
          setFeaturedVideo(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const onPlay = useCallback((v: VideoRecord) => setSelectedVideo(v), []);
  const onProgress = useCallback((_video: VideoRecord, _pct: number) => {}, []);
  const onComplete = useCallback((_video: VideoRecord) => {}, []);

  if (isLoading) {
    return (
      <div className="space-y-6 px-0.5 pt-2">
        <div className="h-[220px] shrink-0 animate-pulse rounded-2xl bg-muted/40 md:h-[260px]" />
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted/40" />
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 min-w-[260px] shrink-0 animate-pulse rounded-xl bg-muted/35"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const access = (user?.user_metadata as { access_level?: string } | undefined)
    ?.access_level;
  const userAccessLevel = access ?? 'free';
  if (userAccessLevel === 'free') {
    return (
      <div className="px-0.5 pt-2">
        <AccessDenied requiredLevel="user" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="rounded-2xl border border-border/50 bg-card/40 p-8 shadow-sm">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            No lessons yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            New videos will appear here when they are published.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 px-0.5 pb-6 pt-2">
        <InsightClassroomFeatured video={featuredVideo} onPlay={onPlay} />
        {groupedVideos.map((group) => (
          <InsightClassroomRow
            key={group.category}
            title={group.title}
            videos={group.videos}
            onPlay={onPlay}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedVideo ? (
          <VideoPlayer
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onProgress={onProgress}
            onComplete={onComplete}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
