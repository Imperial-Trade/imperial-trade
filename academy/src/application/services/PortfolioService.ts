
import { IPortfolioRepository } from '@/domain/interfaces/repositories/IPortfolioRepository';
import { CreatePortfolioItemDto, UpdatePortfolioItemDto, PortfolioItemResponseDto } from '@/domain/dtos/portfolio/CreatePortfolioItemDto';

export class PortfolioService {
  constructor(private portfolioRepository: IPortfolioRepository) {}

  async getAllItems(userId: string): Promise<PortfolioItemResponseDto[]> {
    const items = await this.portfolioRepository.findAllItems(userId);
    return items.map(item => ({
      id: item.id,
      assetName: item.assetName,
      ticker: item.ticker,
      assetType: item.assetType,
      quantity: item.quantity,
      avgBuyPrice: item.avgBuyPrice,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }));
  }

  async createItem(dto: CreatePortfolioItemDto, userId: string): Promise<PortfolioItemResponseDto> {
    // Validation
    if (!dto.assetName?.trim()) {
      throw new Error('Asset name is required');
    }
    if (!dto.ticker?.trim()) {
      throw new Error('Ticker is required');
    }
    if (dto.quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    if (dto.avgBuyPrice <= 0) {
      throw new Error('Average buy price must be positive');
    }

    const item = await this.portfolioRepository.createItem(dto, userId);
    return {
      id: item.id,
      assetName: item.assetName,
      ticker: item.ticker,
      assetType: item.assetType,
      quantity: item.quantity,
      avgBuyPrice: item.avgBuyPrice,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  async updateItem(id: string, dto: UpdatePortfolioItemDto, userId: string): Promise<PortfolioItemResponseDto> {
    const existingItem = await this.portfolioRepository.findItemById(id);
    if (!existingItem) {
      throw new Error('Portfolio item not found');
    }
    
    if (!existingItem.canBeEditedBy(userId)) {
      throw new Error('Unauthorized to edit this item');
    }

    // Validation
    if (dto.quantity !== undefined && dto.quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    if (dto.avgBuyPrice !== undefined && dto.avgBuyPrice <= 0) {
      throw new Error('Average buy price must be positive');
    }

    const item = await this.portfolioRepository.updateItem(id, dto);
    return {
      id: item.id,
      assetName: item.assetName,
      ticker: item.ticker,
      assetType: item.assetType,
      quantity: item.quantity,
      avgBuyPrice: item.avgBuyPrice,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  async deleteItem(id: string, userId: string): Promise<void> {
    const existingItem = await this.portfolioRepository.findItemById(id);
    if (!existingItem) {
      throw new Error('Portfolio item not found');
    }
    
    if (!existingItem.canBeEditedBy(userId)) {
      throw new Error('Unauthorized to delete this item');
    }

    await this.portfolioRepository.deleteItem(id);
  }
}
