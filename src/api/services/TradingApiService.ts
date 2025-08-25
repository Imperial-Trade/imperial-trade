import { apiClient } from '../client/ApiClient';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { ApiResponse } from '@/types/common';
import { isTradeAlert } from '@/types/guards';

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
  private static instance: TradingApiService;

  private constructor() {}

  static getInstance(): TradingApiService {
    if (!TradingApiService.instance) {
      TradingApiService.instance = new TradingApiService();
    }
    return TradingApiService.instance;
  }

  async createAlert(dto: CreateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      // Check if user is educator/admin to auto-mark as Xeon Stream
      const { data: profileData } = await apiClient.select('profiles', {
        eq: { column: 'id', value: userId }
      });

      const isEducatorOrAdmin = profileData && profileData.length > 0 && 
        (profileData[0].access_level === 'admin' || 
         profileData[0].access_level === 'moderator' || 
         profileData[0].user_type === 'educator');

      const alertData = {
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
        status: dto.status || 'pending',
        // Auto-mark educator/admin signals as Xeon Stream
        is_xeon_stream: isEducatorOrAdmin
      };

      const result = await apiClient.insert('trade_alerts', alertData);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to create alert',
          data: undefined
        };
      }

      const createdAlert = result.data[0];
      if (!isTradeAlert(createdAlert)) {
        return {
          success: false,
          error: 'Invalid alert data returned from database',
          data: undefined
        };
      }

      const responseDto: TradeAlertResponseDto = {
        id: createdAlert.id,
        userId: createdAlert.user_id,
        assetName: createdAlert.asset_name,
        tradermadeSymbol: createdAlert.tradermade_symbol,
        tradeType: createdAlert.trade_type,
        entryPrice: Number(createdAlert.entry_price),
        stopLoss: Number(createdAlert.stop_loss),
        status: createdAlert.status,
        tp1: createdAlert.tp1 ? Number(createdAlert.tp1) : undefined,
        tp2: createdAlert.tp2 ? Number(createdAlert.tp2) : undefined,
        tp3: createdAlert.tp3 ? Number(createdAlert.tp3) : undefined,
        tp4: createdAlert.tp4 ? Number(createdAlert.tp4) : undefined,
        tp5: createdAlert.tp5 ? Number(createdAlert.tp5) : undefined,
        tpHits: createdAlert.tp_hits || [],
        notes: createdAlert.notes,
        closeReason: createdAlert.close_reason,
        createdAt: createdAlert.created_at,
        updatedAt: createdAlert.updated_at
      };

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

  async getAllAlerts(userId: string): Promise<ApiResponse<TradeAlertResponseDto[]>> {
    try {
      const result = await apiClient.select('trade_alerts', {
        eq: { column: 'user_id', value: userId },
        order: { column: 'created_at', ascending: false }
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to fetch alerts',
          data: undefined
        };
      }

      const responseDtos: TradeAlertResponseDto[] = result.data
        .filter(isTradeAlert)
        .map(alert => ({
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

  async getAlertsByStatus(status: 'pending' | 'active' | 'closed', userId: string): Promise<ApiResponse<TradeAlertResponseDto[]>> {
    try {
      const result = await apiClient.select('trade_alerts', {
        eq: { column: 'user_id', value: userId },
        filter: { column: 'status', value: status },
        order: { column: 'created_at', ascending: false }
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to fetch alerts by status',
          data: undefined
        };
      }

      const responseDtos: TradeAlertResponseDto[] = result.data
        .filter(isTradeAlert)
        .map(alert => ({
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

  async updateAlert(id: string, dto: UpdateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      const updateData: any = {};
      
      if (dto.assetName !== undefined) updateData.asset_name = dto.assetName;
      if (dto.tradermadeSymbol !== undefined) updateData.tradermade_symbol = dto.tradermadeSymbol;
      if (dto.tradeType !== undefined) updateData.trade_type = dto.tradeType;
      if (dto.entryPrice !== undefined) updateData.entry_price = dto.entryPrice;
      if (dto.stopLoss !== undefined) updateData.stop_loss = dto.stopLoss;
      if (dto.tp1 !== undefined) updateData.tp1 = dto.tp1;
      if (dto.tp2 !== undefined) updateData.tp2 = dto.tp2;
      if (dto.tp3 !== undefined) updateData.tp3 = dto.tp3;
      if (dto.tp4 !== undefined) updateData.tp4 = dto.tp4;
      if (dto.tp5 !== undefined) updateData.tp5 = dto.tp5;
      if (dto.status !== undefined) updateData.status = dto.status;
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.closeReason !== undefined) updateData.close_reason = dto.closeReason;
      if (dto.tpHits !== undefined) updateData.tp_hits = dto.tpHits;

      const result = await apiClient.update('trade_alerts', updateData, {
        and: [
          { column: 'id', value: id },
          { column: 'user_id', value: userId }
        ]
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to update alert',
          data: undefined
        };
      }

      const updatedAlert = result.data[0];
      if (!isTradeAlert(updatedAlert)) {
        return {
          success: false,
          error: 'Invalid alert data returned from database',
          data: undefined
        };
      }

      const responseDto: TradeAlertResponseDto = {
        id: updatedAlert.id,
        userId: updatedAlert.user_id,
        assetName: updatedAlert.asset_name,
        tradermadeSymbol: updatedAlert.tradermade_symbol,
        tradeType: updatedAlert.trade_type,
        entryPrice: Number(updatedAlert.entry_price),
        stopLoss: Number(updatedAlert.stop_loss),
        status: updatedAlert.status,
        tp1: updatedAlert.tp1 ? Number(updatedAlert.tp1) : undefined,
        tp2: updatedAlert.tp2 ? Number(updatedAlert.tp2) : undefined,
        tp3: updatedAlert.tp3 ? Number(updatedAlert.tp3) : undefined,
        tp4: updatedAlert.tp4 ? Number(updatedAlert.tp4) : undefined,
        tp5: updatedAlert.tp5 ? Number(updatedAlert.tp5) : undefined,
        tpHits: updatedAlert.tp_hits || [],
        notes: updatedAlert.notes,
        closeReason: updatedAlert.close_reason,
        createdAt: updatedAlert.created_at,
        updatedAt: updatedAlert.updated_at
      };

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

  async deleteAlert(id: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const result = await apiClient.delete('trade_alerts', {
        and: [
          { column: 'id', value: id },
          { column: 'user_id', value: userId }
        ]
      });

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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }
}

export const tradingApiService = TradingApiService.getInstance();
