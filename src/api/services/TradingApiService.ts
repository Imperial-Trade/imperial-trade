import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { CreateTradeAlertDto, UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

export type TradeAlertRow = Database['public']['Tables']['trade_alerts']['Row'];

export type TradeAlertWithProfile = TradeAlertRow & {
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export class TradingApiService {
  static async findAllTradeAlerts(userId: string): Promise<TradeAlertWithProfile[]> {
    try {
      const { data, error } = await supabase
        .from('trade_alerts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trade alerts:', error);
        throw error;
      }

      return data as TradeAlertWithProfile[];
    } catch (error) {
      console.error('Error in findAllTradeAlerts:', error);
      throw error;
    }
  }

  static async findTradeAlertById(id: string): Promise<TradeAlertWithProfile | null> {
    try {
      const { data, error } = await supabase
        .from('trade_alerts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching trade alert with id ${id}:`, error);
        return null;
      }

      return data as TradeAlertWithProfile;
    } catch (error) {
      console.error(`Error in findTradeAlertById:`, error);
      return null;
    }
  }

  static async findTradeAlertsByStatus(status: 'pending' | 'active' | 'closed' | 'partially_profited', userId: string): Promise<TradeAlertWithProfile[]> {
    try {
      const { data, error } = await supabase
        .from('trade_alerts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error fetching trade alerts with status ${status}:`, error);
        throw error;
      }

      return data as TradeAlertWithProfile[];
    } catch (error) {
      console.error(`Error in findTradeAlertsByStatus:`, error);
      throw error;
    }
  }

  static async createTradeAlert(dto: CreateTradeAlertDto, userId: string) {
    console.log('🔄 TradingApiService.createTradeAlert - Input:', { dto, userId });
    
    try {
      const { data, error } = await supabase
        .from('trade_alerts')
        .insert({
          user_id: userId,
          asset_name: dto.assetName,
          tradermade_symbol: dto.tradermadeSymbol,
          trade_type: dto.tradeType,
          entry_price: dto.entryPrice,
          stop_loss: dto.stopLoss,
          tp1: dto.tp1,
          tp2: dto.tp2,
          tp3: dto.tp3,
          tp4: dto.tp4,
          tp5: dto.tp5,
          notes: dto.notes,
          // Remove status field - let database trigger handle it
          tp_hits: [],
        })
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('❌ TradingApiService.createTradeAlert - Database error:', error);
        throw error;
      }

      console.log('✅ TradingApiService.createTradeAlert - Success:', data);
      return data as TradeAlertWithProfile;
    } catch (error) {
      console.error('❌ TradingApiService.createTradeAlert - Error:', error);
      throw error;
    }
  }

  static async updateTradeAlert(id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertWithProfile> {
    try {
       console.log(`Attempting to update trade alert with ID: ${id} with DTO:`, dto);
      const { data, error } = await supabase
        .from('trade_alerts')
        .update(dto)
        .eq('id', id)
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error(`Error updating trade alert with id ${id}:`, error);
        throw error;
      }

      console.log(`Trade alert with ID: ${id} updated successfully. Result:`, data);
      return data as TradeAlertWithProfile;
    } catch (error) {
      console.error(`Error in updateTradeAlert:`, error);
      throw error;
    }
  }

  static async deleteTradeAlert(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('trade_alerts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting trade alert with id ${id}:`, error);
        throw error;
      }

      console.log(`Trade alert with ID: ${id} deleted successfully.`);
    } catch (error) {
      console.error(`Error in deleteTradeAlert:`, error);
      throw error;
    }
  }
}
