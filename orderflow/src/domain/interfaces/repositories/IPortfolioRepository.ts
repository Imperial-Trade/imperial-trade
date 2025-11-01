
import { PortfolioItem } from '../../entities/portfolio/PortfolioItem';
import { CreatePortfolioItemDto, UpdatePortfolioItemDto } from '../../dtos/portfolio/CreatePortfolioItemDto';

export interface IPortfolioRepository {
  findAllItems(userId: string): Promise<PortfolioItem[]>;
  findItemById(id: string): Promise<PortfolioItem | null>;
  createItem(dto: CreatePortfolioItemDto, userId: string): Promise<PortfolioItem>;
  updateItem(id: string, dto: UpdatePortfolioItemDto): Promise<PortfolioItem>;
  deleteItem(id: string): Promise<void>;
}
