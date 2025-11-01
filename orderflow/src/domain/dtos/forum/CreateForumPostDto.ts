
export interface CreateForumPostDto {
  title: string;
  content: string;
  category: 'discussion' | 'question' | 'analysis' | 'news' | 'strategy';
  tags?: string[];
}

export interface UpdateForumPostDto {
  title?: string;
  content?: string;
  category?: 'discussion' | 'question' | 'analysis' | 'news' | 'strategy';
  tags?: string[];
}

export interface ForumPostResponseDto {
  id: string;
  title: string;
  content: string;
  userId: string;
  category: 'discussion' | 'question' | 'analysis' | 'news' | 'strategy';
  tags: string[];
  likes: number;
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
}
