
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

export type TradeAlertRow = Database['public']['Tables']['trade_alerts']['Row'];

// Updated type with camelCase and creator object
export type TradeAlertWithProfile = {
  id: string;
  userId: string;
  assetName: string;
  tradermadeSymbol: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: number;
  stopLoss: number;
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tpHits: number[];
  notes?: string;
  closeReason?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string;
    user_type?: string;
    access_level?: string;
  };
};

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Private function to convert snake_case DB row to camelCase DTO
function mapToTradeAlertWithProfile(row: TradeAlertRow, profile?: any): TradeAlertWithProfile {
  return {
    id: row.id,
    userId: row.user_id,
    assetName: row.asset_name,
    tradermadeSymbol: row.tradermade_symbol,
    tradeType: row.trade_type,
    entryPrice: Number(row.entry_price),
    stopLoss: Number(row.stop_loss),
    status: row.status,
    tp1: row.tp1 ? Number(row.tp1) : undefined,
    tp2: row.tp2 ? Number(row.tp2) : undefined,
    tp3: row.tp3 ? Number(row.tp3) : undefined,
    tp4: row.tp4 ? Number(row.tp4) : undefined,
    tp5: row.tp5 ? Number(row.tp5) : undefined,
    tpHits: row.tp_hits || [],
    notes: row.notes || undefined,
    closeReason: row.close_reason || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creator: profile ? {
      id: profile.id,
      display_name: profile.display_name || 'Unknown User',
      role: profile.role || profile.user_type || profile.access_level || 'member',
      avatar_url: profile.avatar_url,
      user_type: profile.user_type,
      access_level: profile.access_level,
    } : undefined
  };
}

export class TradingApiService {
  // Get all alerts for a specific user with profiles
  async getAllAlerts(userId: string): Promise<ApiResponse<TradeAlertWithProfile[]>> {
    try {
      // Fetch trade alerts for the user
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (alertsError) {
        console.error('Error fetching user alerts:', alertsError);
        return { success: false, error: alertsError.message };
      }

      if (!alertsData || alertsData.length === 0) {
        return { success: true, data: [] };
      }

      // Fetch profile for the user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      // Map to camelCase format
      const mappedAlerts = alertsData.map(alert => mapToTradeAlertWithProfile(alert, profileData));

      return { success: true, data: mappedAlerts };
    } catch (error) {
      console.error('Error in getAllAlerts:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get all public alerts from educators/admins with profiles
  async getAllPublicAlertsWithProfiles(): Promise<ApiResponse<TradeAlertWithProfile[]>> {
    try {
      // Fetch ALL trade alerts - RLS will filter to show only educator/admin signals
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (alertsError) {
        console.error('Error fetching public alerts:', alertsError);
        return { success: false, error: alertsError.message };
      }

      if (!alertsData || alertsData.length === 0) {
        return { success: true, data: [] };
      }

      // Get unique user IDs from alerts
      const userIds = [...new Set(alertsData.map(alert => alert.user_id))];

      // Fetch profiles for all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create profile map for quick lookup
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Map to camelCase format with profiles
      const mappedAlerts = alertsData.map(alert => {
        const profile = profilesMap.get(alert.user_id);
        return mapToTradeAlertWithProfile(alert, profile);
      });

      return { success: true, data: mappedAlerts };
    } catch (error) {
      console.error('Error in getAllPublicAlertsWithProfiles:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get alerts by status
  async getAlertsByStatus(status: 'pending' | 'active' | 'closed' | 'partially_profited', userId: string): Promise<ApiResponse<TradeAlertWithProfile[]>> {
    try {
      // Fetch trade alerts for the user with specific status
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (alertsError) {
        console.error(`Error fetching alerts with status ${status}:`, alertsError);
        return { success: false, error: alertsError.message };
      }

      if (!alertsData || alertsData.length === 0) {
        return { success: true, data: [] };
      }

      // Fetch profile for the user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      // Map to camelCase format
      const mappedAlerts = alertsData.map(alert => mapToTradeAlertWithProfile(alert, profileData));

      return { success: true, data: mappedAlerts };
    } catch (error) {
      console.error(`Error in getAlertsByStatus:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Create alert - returns TradeAlertResponseDto
  async createAlert(dto: CreateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    console.log('🔄 TradingApiService.createAlert - Input:', { dto, userId });
    
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
          tp_hits: [],
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ TradingApiService.createAlert - Database error:', error);
        return { success: false, error: error.message };
      }

      // Convert to TradeAlertResponseDto (camelCase)
      const responseDto: TradeAlertResponseDto = {
        id: data.id,
        userId: data.user_id,
        assetName: data.asset_name,
        tradermadeSymbol: data.tradermade_symbol,
        tradeType: data.trade_type,
        entryPrice: Number(data.entry_price),
        stopLoss: Number(data.stop_loss),
        status: data.status,
        tp1: data.tp1 ? Number(data.tp1) : undefined,
        tp2: data.tp2 ? Number(data.tp2) : undefined,
        tp3: data.tp3 ? Number(data.tp3) : undefined,
        tp4: data.tp4 ? Number(data.tp4) : undefined,
        tp5: data.tp5 ? Number(data.tp5) : undefined,
        tpHits: data.tp_hits || [],
        notes: data.notes,
        closeReason: data.close_reason,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      console.log('✅ TradingApiService.createAlert - Success:', responseDto);
      return { success: true, data: responseDto };
    } catch (error) {
      console.error('❌ TradingApiService.createAlert - Error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update alert - returns TradeAlertResponseDto
  async updateAlert(id: string, dto: UpdateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      console.log(`Attempting to update trade alert with ID: ${id} with DTO:`, dto);
      const { data, error } = await supabase
        .from('trade_alerts')
        .update({
          status: dto.status,
          tp_hits: dto.tpHits,
          close_reason: dto.closeReason,
          notes: dto.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId) // Ensure user can only update their own alerts
        .select('*')
        .single();

      if (error) {
        console.error(`Error updating trade alert with id ${id}:`, error);
        return { success: false, error: error.message };
      }

      // Convert to TradeAlertResponseDto (camelCase)
      const responseDto: TradeAlertResponseDto = {
        id: data.id,
        userId: data.user_id,
        assetName: data.asset_name,
        tradermadeSymbol: data.tradermade_symbol,
        tradeType: data.trade_type,
        entryPrice: Number(data.entry_price),
        stopLoss: Number(data.stop_loss),
        status: data.status,
        tp1: data.tp1 ? Number(data.tp1) : undefined,
        tp2: data.tp2 ? Number(data.tp2) : undefined,
        tp3: data.tp3 ? Number(data.tp3) : undefined,
        tp4: data.tp4 ? Number(data.tp4) : undefined,
        tp5: data.tp5 ? Number(data.tp5) : undefined,
        tpHits: data.tp_hits || [],
        notes: data.notes,
        closeReason: data.close_reason,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      console.log(`Trade alert with ID: ${id} updated successfully. Result:`, responseDto);
      return { success: true, data: responseDto };
    } catch (error) {
      console.error(`Error in updateAlert:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete alert
  async deleteAlert(id: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('trade_alerts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Ensure user can only delete their own alerts

      if (error) {
        console.error(`Error deleting trade alert with id ${id}:`, error);
        return { success: false, error: error.message };
      }

      console.log(`Trade alert with ID: ${id} deleted successfully.`);
      return { success: true };
    } catch (error) {
      console.error(`Error in deleteAlert:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance that existing code expects
export const tradingApiService = new TradingApiService();
