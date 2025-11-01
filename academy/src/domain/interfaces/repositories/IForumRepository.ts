
import { ForumPost } from '../../entities/forum/ForumPost';
import { Reply } from '../../entities/forum/Reply';
import { CreateForumPostDto, UpdateForumPostDto } from '../../dtos/forum/CreateForumPostDto';

export interface IForumRepository {
  // Forum Posts
  findAllPosts(): Promise<ForumPost[]>;
  findPostById(id: string): Promise<ForumPost | null>;
  createPost(dto: CreateForumPostDto, userId: string): Promise<ForumPost>;
  updatePost(id: string, dto: UpdateForumPostDto): Promise<ForumPost>;
  deletePost(id: string): Promise<void>;
  
  // Replies
  findRepliesByPostId(postId: string): Promise<Reply[]>;
  createReply(postId: string, content: string, userId: string): Promise<Reply>;
  updateReply(id: string, content: string): Promise<Reply>;
  deleteReply(id: string): Promise<void>;
}
