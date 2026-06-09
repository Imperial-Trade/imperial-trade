import { supabase } from '@/integrations/supabase/client';
import { normalizePostImages } from '@/insight/normalizePostImages';
import type { Post } from '@/insight/insightPost';

const PUBLIC_PROFILE_BASE_FIELDS =
  'id, display_name, avatar_url, user_type, access_level, trader_level, community_tier';

function mapUserLevel(userType: string, accessLevel: string): string {
  if (accessLevel === 'admin') return 'Elite';
  if (userType === 'educator' || accessLevel === 'moderator') return 'Elite';
  if (userType === 'member') return 'Skilled';
  return 'Apprentice';
}

async function fetchPublicProfilesForAuthorIds(userIds: string[]): Promise<any[]> {
  if (userIds.length === 0) return [];
  const withLocation = await supabase
    .from('public_profiles' as any)
    .select(`${PUBLIC_PROFILE_BASE_FIELDS}, location`)
    .in('id', userIds);
  if (!withLocation.error && Array.isArray(withLocation.data)) {
    return withLocation.data;
  }
  const baseOnly = await supabase
    .from('public_profiles' as any)
    .select(PUBLIC_PROFILE_BASE_FIELDS)
    .in('id', userIds);
  if (baseOnly.error) return [];
  return baseOnly.data ?? [];
}

/**
 * Loads a post pool for tag/symbol frequency scans and text ranking when the
 * `optimized-posts` React Query cache is empty (Imperial has no home feed query).
 */
export async function fetchInsightSearchPostPool(
  userId: string | undefined,
  feedViewMode: 'following' | 'explore'
): Promise<Post[]> {
  let followedUserIds: string[] = [];
  if (feedViewMode === 'following' && userId) {
    const { data: followsData, error: followsError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);
    if (followsError) return [];
    followedUserIds = followsData?.map((f) => f.following_id) || [];
    if (userId && !followedUserIds.includes(userId)) {
      followedUserIds.push(userId);
    }
    if (followedUserIds.length === 0) return [];
  }

  let postsQuery = supabase
    .from('forum_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (feedViewMode === 'following' && followedUserIds.length > 0) {
    postsQuery = postsQuery.in('user_id', followedUserIds);
  }

  const { data: postsDataRaw, error: postsError } = await postsQuery;
  if (postsError) return [];

  const postsData = postsDataRaw || [];
  if (postsData.length === 0) return [];

  const userIds = [...new Set(postsData.map((post) => post.user_id))];
  const profilesData = await fetchPublicProfilesForAuthorIds(userIds);
  const profileMap = new Map(profilesData.map((profile: any) => [profile.id, profile]));

  let userFollows = new Set<string>();
  if (userId) {
    const { data: followsResult } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)
      .in('following_id', userIds);
    userFollows = new Set(followsResult?.map((f) => f.following_id) || []);
  }

  return postsData.map((post) => {
    const profile: any = profileMap.get(post.user_id);
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      author: {
        id: profile?.id || post.user_id,
        display_name: profile?.display_name || 'Trader',
        real_name: profile?.display_name || 'Trader',
        avatar: profile?.avatar_url,
        level: mapUserLevel(profile?.user_type || '', profile?.access_level || ''),
        trader_level: profile?.trader_level || 'Apprentice',
        community_tier: profile?.community_tier || 0,
        isFollowing: userFollows.has(post.user_id),
        location: profile?.location ?? null,
      },
      category: post.category as Post['category'],
      createdAt: new Date(post.created_at),
      likes: post.likes || 0,
      comments: post.replies_count || 0,
      images: normalizePostImages(post.images),
      tags: post.tags || [],
      difficulty: post.difficulty,
      isLiked: false,
      isSaved: false,
    };
  });
}
