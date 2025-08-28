import { apiClient } from '../client/ApiClient';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { ApiResponse } from '@/types/common';

export interface TradeAlertWithProfile extends TradeAlertResponseDto {
  creator?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    role?: string;
    user_type?: string;
    access_level?: string;
  };
}

class TradingApiService {
  async getAllAlerts(userId: string): Promise<ApiResponse<TradeAlertResponseDto[]>> {
    try {
      const result = await apiClient.select('trade_alerts', {
        order: { column: 'created_at', ascending: false }
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const alerts: TradeAlertResponseDto[] = (result.data || []).map(alert => ({
        id: alert.id,
        userId: alert.user_id,
        assetName: alert.asset_name,
        tradermadeSymbol: alert.tradermade_symbol,
        tradeType: alert.trade_type,
        entryPrice: Number(alert.entry_price),
        stopLoss: Number(alert.stop_loss),
        status: alert.status,
        tp1: alert.tp1 ? Number(alert.tp1) : undefined,
        tp2: alert.tp2 ? Number(alert.tp2) : undefined,
        tp3: alert.tp3 ? Number(alert.tp3) : undefined,
        tp4: alert.tp4 ? Number(alert.tp4) : undefined,
        tp5: alert.tp5 ? Number(alert.tp5) : undefined,
        tpHits: alert.tp_hits || [],
        notes: alert.notes,
        closeReason: alert.close_reason,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at
      }));

      return { success: true, data: alerts };
    } catch (error) {
      console.error('Error fetching all alerts:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getAllAlertsWithProfiles(userId: string): Promise<ApiResponse<TradeAlertWithProfile[]>> {
    try {
      const result = await apiClient.select('trade_alerts', {
        order: { column: 'created_at', ascending: false }
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Get unique user IDs from alerts
      const userIds = [...new Set((result.data || []).map(alert => alert.user_id))];
      
      // Fetch profiles for these users
      const profilesResult = await apiClient.select('public_profiles', {});
      const profilesMap = new Map();
      
      if (profilesResult.success && profilesResult.data) {
        profilesResult.data.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const alertsWithProfiles: TradeAlertWithProfile[] = (result.data || []).map(alert => {
        const profile = profilesMap.get(alert.user_id);
        
        return {
          id: alert.id,
          userId: alert.user_id,
          assetName: alert.asset_name,
          tradermadeSymbol: alert.tradermade_symbol,
          tradeType: alert.trade_type,
          entryPrice: Number(alert.entry_price),
          stopLoss: Number(alert.stop_loss),
          status: alert.status,
          tp1: alert.tp1 ? Number(alert.tp1) : undefined,
          tp2: alert.tp2 ? Number(alert.tp2) : undefined,
          tp3: alert.tp3 ? Number(alert.tp3) : undefined,
          tp4: alert.tp4 ? Number(alert.tp4) : undefined,
          tp5: alert.tp5 ? Number(alert.tp5) : undefined,
          tpHits: alert.tp_hits || [],
          notes: alert.notes,
          closeReason: alert.close_reason,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at,
          creator: profile ? {
            id: profile.id,
            display_name: profile.display_name || 'Unknown',
            avatar_url: profile.avatar_url,
            role: profile.role,
            user_type: profile.user_type,
            access_level: profile.access_level
          } : undefined
        };
      });

      return { success: true, data: alertsWithProfiles };
    } catch (error) {
      console.error('Error fetching alerts with profiles:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getAllPublicAlertsWithProfiles(): Promise<ApiResponse<TradeAlertWithProfile[]>> {
    try {
      const result = await apiClient.select('trade_alerts', {
        order: { column: 'created_at', ascending: false }
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Get unique user IDs from alerts
      const userIds = [...new Set((result.data || []).map(alert => alert.user_id))];
      
      // Fetch profiles for these users
      const profilesResult = await apiClient.select('public_profiles', {});
      const profilesMap = new Map();
      
      if (profilesResult.success && profilesResult.data) {
        profilesResult.data.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const alertsWithProfiles: TradeAlertWithProfile[] = (result.data || []).map(alert => {
        const profile = profilesMap.get(alert.user_id);
        
        return {
          id: alert.id,
          userId: alert.user_id,
          assetName: alert.asset_name,
          tradermadeSymbol: alert.tradermade_symbol,
          tradeType: alert.trade_type,
          entryPrice: Number(alert.entry_price),
          stopLoss: Number(alert.stop_loss),
          status: alert.status,
          tp1: alert.tp1 ? Number(alert.tp1) : undefined,
          tp2: alert.tp2 ? Number(alert.tp2) : undefined,
          tp3: alert.tp3 ? Number(alert.tp3) : undefined,
          tp4: alert.tp4 ? Number(alert.tp4) : undefined,
          tp5: alert.tp5 ? Number(alert.tp5) : undefined,
          tpHits: alert.tp_hits || [],
          notes: alert.notes,
          closeReason: alert.close_reason,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at,
          creator: profile ? {
            id: profile.id,
            display_name: profile.display_name || 'Unknown',
            avatar_url: profile.avatar_url,
            role: profile.role,
            user_type: profile.user_type,
            access_level: profile.access_level
          } : undefined
        };
      });

      return { success: true, data: alertsWithProfiles };
    } catch (error) {
      console.error('Error fetching public alerts with profiles:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getAlertsByStatus(status: 'pending' | 'active' | 'closed' | 'partially_profited', userId: string): Promise<ApiResponse<TradeAlertResponseDto[]>> {
    try {
      const result = await apiClient.select('trade_alerts', {
        eq: { column: 'status', value: status },
        order: { column: 'created_at', ascending: false }
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const alerts: TradeAlertResponseDto[] = (result.data || []).map(alert => ({
        id: alert.id,
        userId: alert.user_id,
        assetName: alert.asset_name,
        tradermadeSymbol: alert.tradermade_symbol,
        tradeType: alert.trade_type,
        entryPrice: Number(alert.entry_price),
        stopLoss: Number(alert.stop_loss),
        status: alert.status,
        tp1: alert.tp1 ? Number(alert.tp1) : undefined,
        tp2: alert.tp2 ? Number(alert.tp2) : undefined,
        tp3: alert.tp3 ? Number(alert.tp3) : undefined,
        tp4: alert.tp4 ? Number(alert.tp4) : undefined,
        tp5: alert.tp5 ? Number(alert.tp5) : undefined,
        tpHits: alert.tp_hits || [],
        notes: alert.notes,
        closeReason: alert.close_reason,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at
      }));

      return { success: true, data: alerts };
    } catch (error) {
      console.error('Error fetching alerts by status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async createAlert(dto: CreateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      // CRITICAL FIX: Use the status from DTO instead of hardcoding to 'active'
      const determinedStatus = dto.status || 'active';
      
      console.log(`🔧 API Service Status Logic: Trade type ${dto.tradeType} → Status ${determinedStatus}`);
      
      // Add validation: limit orders should not be created as 'active' unless explicitly intended
      if ((dto.tradeType === 'buy_limit' || dto.tradeType === 'sell_limit') && determinedStatus === 'active') {
        console.warn(`⚠️ Creating ${dto.tradeType} as 'active' - this may bypass pending activation logic`);
      }

      const insertData = {
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
        user_id: userId,
        status: determinedStatus // Use the determined status instead of hardcoded 'active'
      };

      console.log('📤 API Service Final insert data:', insertData);

      const result = await apiClient.insert('trade_alerts', insertData);

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to create alert' };
      }

      console.log('✅ API Service Created alert with status:', result.data.status);

      const responseDto: TradeAlertResponseDto = {
        id: result.data.id,
        userId: result.data.user_id,
        assetName: result.data.asset_name,
        tradermadeSymbol: result.data.tradermade_symbol,
        tradeType: result.data.trade_type,
        entryPrice: Number(result.data.entry_price),
        stopLoss: Number(result.data.stop_loss),
        status: result.data.status,
        tp1: result.data.tp1 ? Number(result.data.tp1) : undefined,
        tp2: result.data.tp2 ? Number(result.data.tp2) : undefined,
        tp3: result.data.tp3 ? Number(result.data.tp3) : undefined,
        tp4: result.data.tp4 ? Number(result.data.tp4) : undefined,
        tp5: result.data.tp5 ? Number(result.data.tp5) : undefined,
        tpHits: result.data.tp_hits || [],
        notes: result.data.notes,
        closeReason: result.data.close_reason as 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | undefined,
        createdAt: result.data.created_at,
        updatedAt: result.data.updated_at
      };

      return { success: true, data: responseDto };
    } catch (error) {
      console.error('Error creating alert:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async updateAlert(id: string, dto: UpdateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (dto.status) updateData.status = dto.status;
      if (dto.tpHits) updateData.tp_hits = dto.tpHits;
      if (dto.closeReason) updateData.close_reason = dto.closeReason;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      const result = await apiClient.update('trade_alerts', id, updateData);

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to update alert' };
      }

      const responseDto: TradeAlertResponseDto = {
        id: result.data.id,
        userId: result.data.user_id,
        assetName: result.data.asset_name,
        tradermadeSymbol: result.data.tradermade_symbol,
        tradeType: result.data.trade_type,
        entryPrice: Number(result.data.entry_price),
        stopLoss: Number(result.data.stop_loss),
        status: result.data.status,
        tp1: result.data.tp1 ? Number(result.data.tp1) : undefined,
        tp2: result.data.tp2 ? Number(result.data.tp2) : undefined,
        tp3: result.data.tp3 ? Number(result.data.tp3) : undefined,
        tp4: result.data.tp4 ? Number(result.data.tp4) : undefined,
        tp5: result.data.tp5 ? Number(result.data.tp5) : undefined,
        tpHits: result.data.tp_hits || [],
        notes: result.data.notes,
        closeReason: result.data.close_reason,
        createdAt: result.data.created_at,
        updatedAt: result.data.updated_at
      };

      return { success: true, data: responseDto };
    } catch (error) {
      console.error('Error updating alert:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async deleteAlert(id: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const result = await apiClient.delete('trade_alerts', id);

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to delete alert' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting alert:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const tradingApiService = new TradingApiService();
