
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreateTradeAlertDto, UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { TradeAlertWithProfile } from '@/types/trading';

interface UseTradingResult {
  alerts: TradeAlertWithProfile[];
  loading: boolean;
  error: string | null;
  createAlert: (data: CreateTradeAlertDto) => Promise<TradeAlertWithProfile | null>;
  updateAlert: (id: string, data: UpdateTradeAlertDto) => Promise<TradeAlertWithProfile | null>;
  deleteAlert: (id: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
}

export const useOptimizedTrading = (userId?: string): UseTradingResult => {
  const [alerts, setAlerts] = useState<TradeAlertWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const effectiveUserId = userId || user?.id || '';

  const fetchAlerts = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        setError(error.message);
        return;
      }

      // Fetch profiles for each alert
      const profiles = await Promise.all(
        data.map(async (alert) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', alert.user_id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return null;
          }

          return profile;
        })
      );

      const alertsWithProfiles = data.map((alert, index) => ({
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
        creator: profiles[index]
          ? {
              id: profiles[index].id,
              display_name: profiles[index].display_name || 'Anonymous User',
              role: profiles[index].role || 'user',
              avatar_url: profiles[index].avatar_url,
              user_type: profiles[index].user_type,
              access_level: profiles[index].access_level
            }
          : {
              id: alert.user_id,
              display_name: 'Unknown User',
              role: 'user',
              avatar_url: null,
              user_type: null,
              access_level: null
            },
      }));

      setAlerts(alertsWithProfiles);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, effectiveUserId]);

  const createAlert = useCallback(
    async (data: CreateTradeAlertDto): Promise<TradeAlertWithProfile | null> => {
      if (!user?.id) {
        setError('User ID not found. Please log in.');
        return null;
      }

      try {
        const { data: result, error } = await supabase
          .from('trade_alerts')
          .insert({
            user_id: user.id,
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
          console.error('Error creating alert:', error);
          setError(error.message);
          return null;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', result.user_id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        const newAlert: TradeAlertWithProfile = {
          id: result.id,
          userId: result.user_id,
          assetName: result.asset_name,
          tradermadeSymbol: result.tradermade_symbol,
          tradeType: result.trade_type,
          entryPrice: Number(result.entry_price),
          stopLoss: Number(result.stop_loss),
          status: result.status,
          tp1: result.tp1 ? Number(result.tp1) : undefined,
          tp2: result.tp2 ? Number(result.tp2) : undefined,
          tp3: result.tp3 ? Number(result.tp3) : undefined,
          tp4: result.tp4 ? Number(result.tp4) : undefined,
          tp5: result.tp5 ? Number(result.tp5) : undefined,
          tpHits: result.tp_hits || [],
          notes: result.notes,
          closeReason: result.close_reason,
          createdAt: result.created_at,
          updatedAt: result.updated_at,
          creator: profile
            ? {
                id: profile.id,
                display_name: profile.display_name || 'Anonymous User',
                role: profile.role || 'user',
                avatar_url: profile.avatar_url,
                user_type: profile.user_type,
                access_level: profile.access_level
              }
            : {
                id: result.user_id,
                display_name: 'Unknown User',
                role: 'user',
                avatar_url: null,
                user_type: null,
                access_level: null
              },
        };

        setAlerts((prevAlerts) => [newAlert, ...prevAlerts]);
        return newAlert;
      } catch (err) {
        console.error('Error creating alert:', err);
        setError(err instanceof Error ? err.message : 'Failed to create alert');
        return null;
      }
    },
    [user?.id]
  );

  const updateAlert = useCallback(
    async (id: string, data: UpdateTradeAlertDto): Promise<TradeAlertWithProfile | null> => {
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
          console.error('Error updating alert:', error);
          setError(error.message);
          return null;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', result.user_id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        const updatedAlert: TradeAlertWithProfile = {
          id: result.id,
          userId: result.user_id,
          assetName: result.asset_name,
          tradermadeSymbol: result.tradermade_symbol,
          tradeType: result.trade_type,
          entryPrice: Number(result.entry_price),
          stopLoss: Number(result.stop_loss),
          status: result.status,
          tp1: result.tp1 ? Number(result.tp1) : undefined,
          tp2: result.tp2 ? Number(result.tp2) : undefined,
          tp3: result.tp3 ? Number(result.tp3) : undefined,
          tp4: result.tp4 ? Number(result.tp4) : undefined,
          tp5: result.tp5 ? Number(result.tp5) : undefined,
          tpHits: result.tp_hits || [],
          notes: result.notes,
          closeReason: result.close_reason,
          createdAt: result.created_at,
          updatedAt: result.updated_at,
          creator: profile
            ? {
                id: profile.id,
                display_name: profile.display_name || 'Anonymous User',
                role: profile.role || 'user',
                avatar_url: profile.avatar_url,
                user_type: profile.user_type,
                access_level: profile.access_level
              }
            : {
                id: result.user_id,
                display_name: 'Unknown User',
                role: 'user',
                avatar_url: null,
                user_type: null,
                access_level: null
              },
        };

        setAlerts((prevAlerts) =>
          prevAlerts.map((alert) => (alert.id === id ? updatedAlert : alert))
        );
        return updatedAlert;
      } catch (err) {
        console.error('Error updating alert:', err);
        setError(err instanceof Error ? err.message : 'Failed to update alert');
        return null;
      }
    },
    []
  );

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('trade_alerts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting alert:', error);
        setError(error.message);
        return false;
      }

      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
      return false;
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    await fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts,
  };
};
