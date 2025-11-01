
import { IForumRepository } from '@/domain/interfaces/repositories/IForumRepository';
import { ForumPost } from '@/domain/entities/forum/ForumPost';
import { Reply } from '@/domain/entities/forum/Reply';
import { CreateForumPostDto, UpdateForumPostDto, ForumPostResponseDto } from '@/domain/dtos/forum/CreateForumPostDto';

export class ForumService {
  constructor(private forumRepository: IForumRepository) {}

  async getAllPosts(): Promise<ForumPostResponseDto[]> {
    const posts = await this.forumRepository.findAllPosts();
    return posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      userId: post.userId,
      category: post.category,
      tags: post.tags,
      likes: post.likes,
      repliesCount: post.repliesCount,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    }));
  }

  async getPostById(id: string): Promise<ForumPostResponseDto | null> {
    const post = await this.forumRepository.findPostById(id);
    if (!post) return null;
    
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      userId: post.userId,
      category: post.category,
      tags: post.tags,
      likes: post.likes,
      repliesCount: post.repliesCount,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  }

  async createPost(dto: CreateForumPostDto, userId: string): Promise<ForumPostResponseDto> {
    if (!dto.title?.trim()) {
      throw new Error('Title is required');
    }
    if (!dto.content?.trim()) {
      throw new Error('Content is required');
    }

    const post = await this.forumRepository.createPost(dto, userId);
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      userId: post.userId,
      category: post.category,
      tags: post.tags,
      likes: post.likes,
      repliesCount: post.repliesCount,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  }

  async updatePost(id: string, dto: UpdateForumPostDto, userId: string): Promise<ForumPostResponseDto> {
    const existingPost = await this.forumRepository.findPostById(id);
    if (!existingPost) {
      throw new Error('Post not found');
    }
    
    if (!existingPost.canBeEditedBy(userId)) {
      throw new Error('Unauthorized to edit this post');
    }

    const post = await this.forumRepository.updatePost(id, dto);
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      userId: post.userId,
      category: post.category,
      tags: post.tags,
      likes: post.likes,
      repliesCount: post.repliesCount,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  }

  async deletePost(id: string, userId: string): Promise<void> {
    const existingPost = await this.forumRepository.findPostById(id);
    if (!existingPost) {
      throw new Error('Post not found');
    }
    
    if (!existingPost.canBeDeletedBy(userId)) {
      throw new Error('Unauthorized to delete this post');
    }

    await this.forumRepository.deletePost(id);
  }

  async getRepliesByPostId(postId: string): Promise<Reply[]> {
    return this.forumRepository.findRepliesByPostId(postId);
  }

  async createReply(postId: string, content: string, userId: string): Promise<Reply> {
    if (!content?.trim()) {
      throw new Error('Reply content is required');
    }

    return this.forumRepository.createReply(postId, content, userId);
  }
}
