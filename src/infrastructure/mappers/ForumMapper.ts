
import { Database } from '@/integrations/supabase/types';
import { ForumPost } from '@/domain/entities/forum/ForumPost';
import { Reply } from '@/domain/entities/forum/Reply';

type ForumPostRow = Database['public']['Tables']['forum_posts']['Row'];
type ReplyRow = Database['public']['Tables']['replies']['Row'];

export class ForumMapper {
  static toDomain(row: ForumPostRow): ForumPost {
    return new ForumPost(
      row.id,
      row.title,
      row.content,
      row.user_id,
      row.category,
      row.tags || [],
      row.likes,
      row.replies_count,
      new Date(row.created_at),
      new Date(row.updated_at)
    );
  }

  static replyToDomain(row: ReplyRow): Reply {
    return new Reply(
      row.id,
      row.content,
      row.user_id,
      row.post_id,
      row.likes,
      new Date(row.created_at),
      new Date(row.updated_at)
    );
  }
}
