import { getOrderFlowAppUrl } from '@/utils/environment';
import { getOrderflowTagOrAssetPath } from '@/insight/symbolMapper';

/** Open Orderflow community route (hashtag / asset) in a new tab — Imperial has no equivalent routes yet. */
export function openInsightCommunityTagOrSymbol(raw: string): void {
  const path = getOrderflowTagOrAssetPath(raw);
  const base = getOrderFlowAppUrl().replace(/\/$/, '');
  window.open(`${base}${path}`, '_blank', 'noopener,noreferrer');
}

export function openInsightCommunityProfile(userId: string): void {
  const base = getOrderFlowAppUrl().replace(/\/$/, '');
  window.open(`${base}/profile/${userId}`, '_blank', 'noopener,noreferrer');
}

/** Orderflow full-page comments thread (`/?comments=1&postId=…`). */
export function openInsightCommunityComments(
  postId: string,
  commentId?: string
): void {
  const base = getOrderFlowAppUrl().replace(/\/$/, '');
  const q = new URLSearchParams();
  q.set('comments', '1');
  q.set('postId', postId);
  if (commentId) q.set('commentId', commentId);
  window.open(`${base}/?${q.toString()}`, '_blank', 'noopener,noreferrer');
}
