import { supabase } from '@/integrations/supabase/client';
import { CreateTradeAlertDto, UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

export interface TradeAlertWithProfile {
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
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp';
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    display_name?: string;
    role?: string;
    user_type?: string;
    access_level?: string;
    avatar_url?: string;
  };
}

export class TradingApiService {
  constructor() {}

  static async createAlert(dto: CreateTradeAlertDto, userId: string): Promise<TradeAlertWithProfile> {
    try {
      console.log('TradingApiService - Creating alert:', dto);

      const { data: alertData, error: alertError } = await supabase
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
          notes: dto.notes
        })
        .select('*')
        .single();

      if (alertError) {
        console.error('TradingApiService - Error creating alert:', alertError);
        throw alertError;
      }

      console.log('TradingApiService - Alert created:', alertData);

      // Fetch the profile of the user who created the alert
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('TradingApiService - Error fetching profile:', profileError);
      }

      const alertWithProfile: TradeAlertWithProfile = {
        id: alertData.id,
        userId: alertData.user_id,
        assetName: alertData.asset_name,
        tradermadeSymbol: alertData.tradermade_symbol,
        tradeType: alertData.trade_type,
        entryPrice: alertData.entry_price,
        stopLoss: alertData.stop_loss,
        status: alertData.status,
        tp1: alertData.tp1,
        tp2: alertData.tp2,
        tp3: alertData.tp3,
        tp4: alertData.tp4,
        tp5: alertData.tp5,
        tpHits: alertData.tp_hits || [],
        notes: alertData.notes,
        closeReason: alertData.close_reason,
        createdAt: alertData.created_at,
        updatedAt: alertData.updated_at,
        creator: profileData ? {
          id: profileData.id,
          display_name: profileData.display_name || 'Anonymous User',
          role: profileData.role || 'user',
          user_type: profileData.user_type,
          access_level: profileData.access_level,
          avatar_url: profileData.avatar_url
        } : {
          id: userId,
          display_name: 'Unknown User',
          role: 'user',
          user_type: null,
          access_level: null,
          avatar_url: null
        }
      };

      return alertWithProfile;
    } catch (error) {
      console.error('TradingApiService - Failed to create alert:', error);
      throw error;
    }
  }

  static async updateAlert(id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertWithProfile> {
    try {
      console.log(`TradingApiService - Updating alert ${id} with:`, dto);

      const { data: alertData, error: alertError } = await supabase
        .from('trade_alerts')
        .update(dto)
        .eq('id', id)
        .select('*')
        .single();

      if (alertError) {
        console.error(`TradingApiService - Error updating alert ${id}:`, alertError);
        throw alertError;
      }

      console.log(`TradingApiService - Alert ${id} updated:`, alertData);

      // Fetch the profile of the user who created the alert
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', alertData.user_id)
        .single();

      if (profileError) {
        console.error('TradingApiService - Error fetching profile:', profileError);
      }

      const alertWithProfile: TradeAlertWithProfile = {
        id: alertData.id,
        userId: alertData.user_id,
        assetName: alertData.asset_name,
        tradermadeSymbol: alertData.tradermade_symbol,
        tradeType: alertData.trade_type,
        entryPrice: alertData.entry_price,
        stopLoss: alertData.stop_loss,
        status: alertData.status,
        tp1: alertData.tp1,
        tp2: alertData.tp2,
        tp3: alertData.tp3,
        tp4: alertData.tp4,
        tp5: alertData.tp5,
        tpHits: alertData.tp_hits || [],
        notes: alertData.notes,
        closeReason: alertData.close_reason,
        createdAt: alertData.created_at,
        updatedAt: alertData.updated_at,
        creator: profileData ? {
          id: profileData.id,
          display_name: profileData.display_name || 'Anonymous User',
          role: profileData.role || 'user',
          user_type: profileData.user_type,
          access_level: profileData.access_level,
          avatar_url: profileData.avatar_url
        } : {
          id: alertData.user_id,
          display_name: 'Unknown User',
          role: 'user',
          user_type: null,
          access_level: null,
          avatar_url: null
        }
      };

      return alertWithProfile;
    } catch (error) {
      console.error(`TradingApiService - Failed to update alert ${id}:`, error);
      throw error;
    }
  }

  static async deleteAlert(id: string): Promise<void> {
    try {
      console.log(`TradingApiService - Deleting alert: ${id}`);

      const { error: deleteError } = await supabase
        .from('trade_alerts')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error(`TradingApiService - Error deleting alert ${id}:`, deleteError);
        throw deleteError;
      }

      console.log(`TradingApiService - Alert ${id} deleted successfully`);
    } catch (error) {
      console.error(`TradingApiService - Failed to delete alert ${id}:`, error);
      throw error;
    }
  }

  static async getAllAlerts(adminView = false): Promise<TradeAlertWithProfile[]> {
    try {
      console.log('TradingApiService - Fetching all alerts with admin view:', adminView);

      let query = supabase
        .from('trade_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: alertsData, error: alertsError } = await query;

      if (alertsError) {
        console.error('TradingApiService - Error fetching alerts:', alertsError);
        throw alertsError;
      }

      console.log('TradingApiService - Raw alerts fetched:', alertsData?.length || 0);

      if (!alertsData || alertsData.length === 0) {
        console.log('TradingApiService - No alerts found');
        return [];
      }

      // Get unique user IDs for profile lookup
      const userIds = [...new Set(alertsData.map(alert => alert.user_id))];
      console.log('TradingApiService - Fetching profiles for users:', userIds);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('TradingApiService - Error fetching profiles:', profilesError);
      }

      // Create profile map
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Map alerts with profiles
      const alertsWithProfiles: TradeAlertWithProfile[] = alertsData.map(alert => ({
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
        closeReason: alert.close_reason as 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | undefined,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at,
        creator: profilesMap.get(alert.user_id) ? {
          id: profilesMap.get(alert.user_id).id,
          display_name: profilesMap.get(alert.user_id).display_name || 'Anonymous User',
          role: profilesMap.get(alert.user_id).role || 'user',
          user_type: profilesMap.get(alert.user_id).user_type,
          access_level: profilesMap.get(alert.user_id).access_level,
          avatar_url: profilesMap.get(alert.user_id).avatar_url
        } : {
          id: alert.user_id,
          display_name: 'Unknown User',
          role: 'user',
          user_type: null,
          access_level: null,
          avatar_url: null
        }
      }));

      console.log('TradingApiService - Final alerts with profiles:', alertsWithProfiles.length);

      return alertsWithProfiles;
    } catch (error) {
      console.error('TradingApiService - Failed to fetch alerts:', error);
      throw error;
    }
  }
}
