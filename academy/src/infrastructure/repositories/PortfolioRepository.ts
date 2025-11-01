
import { supabase } from '@/integrations/supabase/client';
import { IPortfolioRepository } from '@/domain/interfaces/repositories/IPortfolioRepository';
import { PortfolioItem } from '@/domain/entities/portfolio/PortfolioItem';
import { CreatePortfolioItemDto, UpdatePortfolioItemDto } from '@/domain/dtos/portfolio/CreatePortfolioItemDto';
import { PortfolioMapper } from '../mappers/PortfolioMapper';

export class PortfolioRepository implements IPortfolioRepository {
  async findAllItems(userId: string): Promise<PortfolioItem[]> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(PortfolioMapper.toDomain);
  }

  async findItemById(id: string): Promise<PortfolioItem | null> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return PortfolioMapper.toDomain(data);
  }

  async createItem(dto: CreatePortfolioItemDto, userId: string): Promise<PortfolioItem> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .insert([{
        asset_name: dto.assetName,
        ticker: dto.ticker,
        asset_type: dto.assetType,
        quantity: dto.quantity,
        avg_buy_price: dto.avgBuyPrice,
        user_id: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    return PortfolioMapper.toDomain(data);
  }

  async updateItem(id: string, dto: UpdatePortfolioItemDto): Promise<PortfolioItem> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .update({
        ...(dto.quantity && { quantity: dto.quantity }),
        ...(dto.avgBuyPrice && { avg_buy_price: dto.avgBuyPrice })
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return PortfolioMapper.toDomain(data);
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
