import { apiClient } from '../client/ApiClient';
import { TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { ApiResponse } from '@/types/common';
import { isTradeAlert } from '@/types/guards';

export class AdminTradingService {
  private static instance: AdminTradingService;

  private constructor() {}

  static getInstance(): AdminTradingService {
    if (!AdminTradingService.instance) {
      AdminTradingService.instance = new AdminTradingService();
    }
    return AdminTradingService.instance;
  }

  async getAllAlertsForAdmin(): Promise<ApiResponse<TradeAlertResponseDto[]>> {
    try {
      // Admin can view all trade alerts regardless of user_id
      const result = await apiClient.select('trade_alerts', {
        order: { column: 'created_at', ascending: false },
        limit: 100 // Pagination for performance
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to fetch alerts for admin',
          data: undefined
        };
      }

      const responseDtos: TradeAlertResponseDto[] = (result.data as any[])
        .filter(isTradeAlert)
        .map((alert: any) => ({
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
          closeReason: (alert.close_reason as unknown as TradeAlertResponseDto['closeReason']), // Narrow to union
          createdAt: alert.created_at,
          updatedAt: alert.updated_at
        }));

      return {
        success: true,
        data: responseDtos,
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

  async getSystemStats(): Promise<ApiResponse<{
    totalUsers: number;
    activeUsers: number;
    totalAlerts: number;
    totalSessions: number;
  }>> {
    try {
      // Get trade alerts count
      const alertsResult = await apiClient.select('trade_alerts', {});
      const alertsCount = alertsResult.success ? (alertsResult.data?.length || 0) : 0;

      // Get live sessions count
      const sessionsResult = await apiClient.select('live_sessions', {});
      const sessionsCount = sessionsResult.success ? (sessionsResult.data?.length || 0) : 0;

      // Note: We can't directly access auth.users, so we'll use available data
      // In a real implementation, you'd use service role or create a profiles table
      const stats = {
        totalUsers: 0, // Would need service role access or profiles table
        activeUsers: 0, // Would need service role access or profiles table
        totalAlerts: alertsCount,
        totalSessions: sessionsCount
      };

      return {
        success: true,
        data: stats,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load system stats',
        data: undefined
      };
    }
  }
}

export const adminTradingService = AdminTradingService.getInstance();
