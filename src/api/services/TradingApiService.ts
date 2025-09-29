import { apiClient, TableRow, TableInsert, TableUpdate } from '../client/ApiClient';
import { supabase } from '@/integrations/supabase/client';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { ApiResponse } from '@/types/common';
import { isTradeAlert } from '@/types/guards';
import { 
  transformTradeAlert, 
  transformTradeAlertWithProfile, 
  transformCreateAlertToDatabase,
  transformUpdateAlertToDatabase,
  TradeAlertWithProfile 
} from '@/utils/dataTransformers';

// Re-export TradeAlertWithProfile for backward compatibility
export type { TradeAlertWithProfile } from '@/utils/dataTransformers';

export class TradingApiService {
  private static instance: TradingApiService;

  private constructor() {}

  static getInstance(): TradingApiService {
    if (!TradingApiService.instance) {
      TradingApiService.instance = new TradingApiService();
    }
    return TradingApiService.instance;
  }

  // Helper method to check if user is admin
  private async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('access_level, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking user admin status:', error);
        return false;
      }

      return profile?.access_level === 'admin' || profile?.role === 'admin';
    } catch (error) {
      console.error('Error in isUserAdmin:', error);
      return false;
    }
  }

  async createAlert(dto: CreateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      console.log('TradingApiService - Creating alert with DTO:', dto);
      console.log('TradingApiService - User ID:', userId);
      
      // ACL: Transform camelCase DTO to snake_case database format
      const insertData = transformCreateAlertToDatabase(dto, userId);
      
      // Override status for limit orders
      const isLimitOrder = dto.tradeType === 'buy_limit' || dto.tradeType === 'sell_limit';
      if (isLimitOrder) {
        (insertData as any).status = 'pending';
      } else {
        (insertData as any).status = 'active';
      }

      console.log('TradingApiService - Insert data:', insertData);

      const result = await apiClient.insert('trade_alerts', insertData as TableInsert<'trade_alerts'>);
      
      console.log('TradingApiService - Insert result:', result);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to create alert',
          data: undefined
        };
      }

      if (!isTradeAlert(result.data)) {
        return {
          success: false,
          error: 'Invalid trade alert data received',
          data: undefined
        };
      }

      // ACL: Transform database response to camelCase DTO
      const responseDto = transformTradeAlert(result.data);

      // Dispatch custom event to notify about new signal
      window.dispatchEvent(new CustomEvent('signal-posted'));

      return {
        success: true,
        data: responseDto,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async updateAlert(id: string, dto: UpdateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      console.log('TradingApiService - Updating alert:', { id, dto, userId });

      // First get the alert to check ownership
      const alertResult = await apiClient.select('trade_alerts', {
        eq: { column: 'id', value: id }
      });

      if (!alertResult.success || !alertResult.data || alertResult.data.length === 0) {
        console.log('TradingApiService - Alert not found:', id);
        return {
          success: false,
          error: 'Alert not found',
          data: undefined
        };
      }

      const alert = alertResult.data[0];
      console.log('TradingApiService - Found alert:', { 
        alertId: alert.id, 
        alertUserId: alert.user_id, 
        requestUserId: userId 
      });

      // Only the owner (educator who posted it) can update
      const isOwner = alert.user_id === userId;

      console.log('TradingApiService - Authorization check:', { 
        isOwner, 
        canUpdate: isOwner 
      });

      if (!isOwner) {
        return {
          success: false,
          error: 'Only the educator who posted this signal can edit it',
          data: undefined
        };
      }

      // ACL: Transform camelCase DTO to snake_case database format
      const updateData = transformUpdateAlertToDatabase(dto);

      console.log('TradingApiService - Updating with data:', updateData);

      const result = await apiClient.update('trade_alerts', id, updateData);
      
      console.log('TradingApiService - Update result:', result);
      
      if (!result.success || !result.data) {
        // Step 4A: Enhanced error handling - surface detailed error messages
        const detailedError = result.error || 'Failed to update alert';
        console.error('TradingApiService - Update failed with detailed error:', {
          error: detailedError,
          alertId: id,
          userId,
          updateData
        });
        
        return {
          success: false,
          error: detailedError,
          data: undefined
        };
      }

      if (!isTradeAlert(result.data)) {
        return {
          success: false,
          error: 'Invalid trade alert data received',
          data: undefined
        };
      }

      // ACL: Transform database response to camelCase DTO
      const responseDto = transformTradeAlert(result.data);

      return {
        success: true,
        data: responseDto,
        error: undefined
      };
    } catch (error) {
      console.error('TradingApiService - Update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async getAllAlerts(userId: string): Promise<ApiResponse<TradeAlertResponseDto[]>> {
    try {
      const result = await apiClient.select('trade_alerts', {
        eq: { column: 'user_id', value: userId },
        order: { column: 'created_at', ascending: false }
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch alerts',
          data: undefined
        };
      }

      // ACL: Transform all database responses to camelCase DTOs
      const responseData = (result.data || [])
        .filter(isTradeAlert)
        .map(transformTradeAlert);

      return {
        success: true,
        data: responseData,
        error: undefined
      };
    } catch (error) {
      console.error('TradingApiService - Get all alerts error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async getAllPublicAlertsWithProfiles(): Promise<ApiResponse<TradeAlertWithProfile[]>> {
    try {
      console.log('TradingApiService - Using RPC function get_alerts_with_profiles');
      
      // Use the working RPC function that properly joins alerts with profiles
      const { data, error } = await supabase
        .rpc('get_alerts_with_profiles')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('TradingApiService - RPC error:', error);
        return {
          success: false,
          error: error.message,
          data: undefined
        };
      }

      if (!data) {
        return {
          success: true,
          data: [],
          error: undefined
        };
      }

      console.log('TradingApiService - RPC returned', data.length, 'alerts with profile data');

      // Transform the RPC result to match the expected interface
      const responseData: TradeAlertWithProfile[] = data.map(alert => ({
        id: alert.id,
        userId: alert.user_id,
        assetName: alert.asset_name,
        tradermadeSymbol: alert.tradermade_symbol,
        tradeType: alert.trade_type as 'buy' | 'sell' | 'buy_limit' | 'sell_limit',
        entryPrice: Number(alert.entry_price),
        stopLoss: Number(alert.stop_loss),
        status: alert.status as 'pending' | 'active' | 'closed' | 'partially_profited',
        tp1: alert.tp1 ? Number(alert.tp1) : undefined,
        tp2: alert.tp2 ? Number(alert.tp2) : undefined,
        tp3: alert.tp3 ? Number(alert.tp3) : undefined,
        tp4: alert.tp4 ? Number(alert.tp4) : undefined,
        tp5: alert.tp5 ? Number(alert.tp5) : undefined,
        tpHits: alert.tp_hits || [],
        notes: alert.notes,
        closeReason: alert.close_reason as 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired' | undefined,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at,
        creator: {
          id: alert.user_id,
          display_name: alert.display_name || 'Unknown User',
          role: alert.role || 'user',
          avatar_url: alert.avatar_url || undefined,
          user_type: alert.user_type || undefined,
          access_level: alert.access_level || undefined,
        }
      }));

      console.log('TradingApiService - Transformed data sample:', responseData[0]?.creator);

      return {
        success: true,
        data: responseData,
        error: undefined
      };
    } catch (error) {
      console.error('TradingApiService - Get public alerts error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
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
        return {
          success: false,
          error: result.error || 'Failed to fetch alerts by status',
          data: undefined
        };
      }

      // ACL: Transform all database responses to camelCase DTOs
      const responseData = (result.data || [])
        .filter(isTradeAlert)
        .map(transformTradeAlert);

      return {
        success: true,
        data: responseData,
        error: undefined
      };
    } catch (error) {
      console.error('TradingApiService - Get alerts by status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async deleteAlert(id: string, userId: string): Promise<ApiResponse<void>> {
    try {
      console.log('TradingApiService - Deleting alert:', { id, userId });

      // First get the alert to check ownership
      const alertResult = await apiClient.select('trade_alerts', {
        eq: { column: 'id', value: id }
      });

      if (!alertResult.success || !alertResult.data || alertResult.data.length === 0) {
        return {
          success: false,
          error: 'Alert not found',
          data: undefined
        };
      }

      const alert = alertResult.data[0];
      const isOwner = alert.user_id === userId;
      const isAdmin = await this.isUserAdmin(userId);

      // Only owner or admin can delete
      if (!isOwner && !isAdmin) {
        return {
          success: false,
          error: 'Only the educator who posted this signal or an admin can delete it',
          data: undefined
        };
      }

      const result = await apiClient.delete('trade_alerts', id);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to delete alert',
          data: undefined
        };
      }

      return {
        success: true,
        data: undefined,
        error: undefined
      };
    } catch (error) {
      console.error('TradingApiService - Delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }
}

export const tradingApiService = TradingApiService.getInstance();