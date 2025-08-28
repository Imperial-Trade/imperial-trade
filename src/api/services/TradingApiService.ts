import { supabase } from '@/integrations/supabase/client';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

export interface TradeAlertWithProfile extends TradeAlertResponseDto {
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string | null;
    user_type?: string | null;
    access_level?: string | null;
  };
}

export class TradingApiService {
  async getTradeAlertsByUserId(userId: string): Promise<TradeAlertResponseDto[]> {
    try {
      const { data, error } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error fetching trade alerts:', error);
        throw new Error(`Failed to fetch trade alerts: ${error.message}`);
      }

      console.log('✅ Trade alerts fetched successfully:', data);
      return data.map(this.mapToResponseDto);
    } catch (error) {
      console.error('❌ TradingApiService.getTradeAlertsByUserId error:', error);
      throw error;
    }
  }

  async getTradeAlertById(id: string): Promise<TradeAlertResponseDto | null> {
    try {
      const { data, error } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // If no data is found, the error will be "No rows found"
        if (error.message.includes("No rows found")) {
          return null; // Return null when no trade alert is found
        }
        console.error('❌ Database error fetching trade alert by ID:', error);
        throw new Error(`Failed to fetch trade alert by ID: ${error.message}`);
      }

      console.log('✅ Trade alert fetched successfully by ID:', data);
      return this.mapToResponseDto(data);
    } catch (error) {
      console.error('❌ TradingApiService.getTradeAlertById error:', error);
      throw error;
    }
  }

  async createTradeAlert(data: CreateTradeAlertDto, userId: string): Promise<TradeAlertResponseDto> {
    console.log('🚀 TradingApiService.createTradeAlert:', {
      assetName: data.assetName,
      tradeType: data.tradeType,
      entryPrice: data.entryPrice,
      userId: userId,
    });

    try {
      const { data: result, error } = await supabase
        .from('trade_alerts')
        .insert({
          user_id: userId,
          asset_name: data.assetName,
          tradermade_symbol: data.tradermadeSymbol,
          trade_type: data.tradeType,
          entry_price: data.entryPrice,
          stop_loss: data.stopLoss,
          tp1: data.tp1,
          tp2: data.tp2,
          tp3: data.tp3,
          tp4: data.tp4,
          tp5: data.tp5,
          notes: data.notes,
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database error creating trade alert:', error);
        throw new Error(`Failed to create trade alert: ${error.message}`);
      }

      console.log('✅ Trade alert created successfully:', result);
      return this.mapToResponseDto(result);
    } catch (error) {
      console.error('❌ TradingApiService.createTradeAlert error:', error);
      throw error;
    }
  }

  async updateTradeAlert(id: string, data: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> {
    console.log(`🔄 TradingApiService.updateTradeAlert (ID: ${id}):`, data);

    try {
      const { data: result, error } = await supabase
        .from('trade_alerts')
        .update({
          status: data.status,
          tp_hits: data.tpHits,
          close_reason: data.closeReason,
          notes: data.notes,
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database error updating trade alert:', error);
        throw new Error(`Failed to update trade alert: ${error.message}`);
      }

      console.log('✅ Trade alert updated successfully:', result);
      return this.mapToResponseDto(result);
    } catch (error) {
      console.error('❌ TradingApiService.updateTradeAlert error:', error);
      throw error;
    }
  }

  async deleteTradeAlert(id: string): Promise<boolean> {
    console.log(`🗑️ TradingApiService.deleteTradeAlert (ID: ${id})`);

    try {
      const { error } = await supabase
        .from('trade_alerts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Database error deleting trade alert:', error);
        throw new Error(`Failed to delete trade alert: ${error.message}`);
      }

      console.log('✅ Trade alert deleted successfully.');
      return true;
    } catch (error) {
      console.error('❌ TradingApiService.deleteTradeAlert error:', error);
      throw error;
    }
  }

  private mapToResponseDto(data: any): TradeAlertResponseDto {
    return {
      id: data.id,
      userId: data.user_id,
      assetName: data.asset_name,
      tradermadeSymbol: data.tradermade_symbol,
      tradeType: data.trade_type,
      entryPrice: data.entry_price,
      stopLoss: data.stop_loss,
      status: data.status,
      tp1: data.tp1,
      tp2: data.tp2,
      tp3: data.tp3,
      tp4: data.tp4,
      tp5: data.tp5,
      tpHits: data.tp_hits || [],
      notes: data.notes,
      closeReason: data.close_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Export singleton instance
export const tradingApiService = new TradingApiService();
