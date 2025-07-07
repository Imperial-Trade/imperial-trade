import { Container } from '@/infrastructure/di/Container';
import { PortfolioService } from '@/application/services/PortfolioService';
import { CreatePortfolioItemDto, UpdatePortfolioItemDto } from '@/domain/dtos/portfolio/CreatePortfolioItemDto';

// Legacy wrapper for backward compatibility
export class PortfolioItem {
  private static get service(): PortfolioService {
    return Container.getInstance().get<PortfolioService>('PortfolioService');
  }

  static async list(userId: string) {
    return this.service.getAllItems(userId);
  }

  static async getById(id: string) {
    // This needs to be implemented in the service layer
    return null;
  }

  static async create(entityData: CreatePortfolioItemDto, userId: string) {
    return this.service.createItem(entityData, userId);
  }

  static async update(id: string, entityData: UpdatePortfolioItemDto, userId: string) {
    return this.service.updateItem(id, entityData, userId);
  }

  static async delete(id: string, userId: string) {
    return this.service.deleteItem(id, userId);
  }
}

// Keep other classes as simple wrappers for now
export { MarketAlert, OpportunitySignal, RiskSimulation } from '../base/BaseEntity';
