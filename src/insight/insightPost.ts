/**
 * Forum post shape for Insight search ranking (matches Orderflow `Post` fields used in search).
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    display_name?: string;
    real_name?: string;
    avatar?: string;
    level: string;
    trader_level: string;
    community_tier: number;
    isFollowing: boolean;
    location?: string | null;
  };
  category: 'discussion' | 'question' | 'analysis' | 'news' | 'strategy';
  createdAt: Date;
  likes: number;
  comments: number;
  images: string[];
  tags: string[];
  difficulty?: string;
  isLiked: boolean;
  isSaved: boolean;
}
