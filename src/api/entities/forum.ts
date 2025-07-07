
import { Container } from '@/infrastructure/di/Container';
import { ForumService } from '@/application/services/ForumService';
import { CreateForumPostDto, UpdateForumPostDto } from '@/domain/dtos/forum/CreateForumPostDto';

// Legacy wrapper for backward compatibility
export class ForumPost {
  private static get service(): ForumService {
    return Container.getInstance().get<ForumService>('ForumService');
  }

  static async list() {
    return this.service.getAllPosts();
  }

  static async create(postData: CreateForumPostDto, userId: string) {
    return this.service.createPost(postData, userId);
  }

  static async getById(id: string) {
    return this.service.getPostById(id);
  }

  static async update(id: string, postData: UpdateForumPostDto, userId: string) {
    return this.service.updatePost(id, postData, userId);
  }

  static async delete(id: string, userId: string) {
    return this.service.deletePost(id, userId);
  }
}

export class Reply {
  private static get service(): ForumService {
    return Container.getInstance().get<ForumService>('ForumService');
  }

  static async list(postId: string) {
    return this.service.getRepliesByPostId(postId);
  }

  static async create(postId: string, content: string, userId: string) {
    return this.service.createReply(postId, content, userId);
  }
}
