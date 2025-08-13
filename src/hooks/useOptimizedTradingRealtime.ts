import { useState, useEffect, useCallback, useRef } from "react";
import { useSignalRealtime } from "./useSignalRealtime";
import {
  tradingApiService,
  TradeAlertWithProfile,
} from "@/api/services/TradingApiService";
import {
  CreateTradeAlertDto,
  UpdateTradeAlertDto,
  TradeAlertResponseDto,
} from "@/domain/dtos/trading/CreateTradeAlertDto";

interface UseOptimizedTradingRealtimeReturn {
  alerts: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  createAlert: (
    dto: CreateTradeAlertDto
  ) => Promise<TradeAlertResponseDto | null>;
  updateAlert: (
    id: string,
    dto: UpdateTradeAlertDto
  ) => Promise<TradeAlertResponseDto | null>;
  deleteAlert: (id: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  lastUpdated: Date | null;
  nextRetryAt: number | null;
}

// This hook provides backward compatibility with the existing useOptimizedTrading interface
// while adding real-time functionality
export const useOptimizedTradingRealtime = (
  userId: string,
  showAllSignals: boolean = false
): UseOptimizedTradingRealtimeReturn => {
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Use the new real-time hook
  const {
    alerts,
    isLoading: realtimeLoading,
    error: realtimeError,
    connectionStatus,
    updateAlert: realtimeUpdateAlert,
    refreshAlerts,
    lastUpdated,
    nextRetryAt,
  } = useSignalRealtime(userId, showAllSignals);

  // Combine loading states
  const isLoading = localLoading || realtimeLoading;

  // Combine error states
  const error = localError || realtimeError;

  const createAlert = useCallback(
    async (dto: CreateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
      if (!userId || !userId.trim()) {
        logger.warn("Cannot create alert: invalid userId");
        return null;
      }

      try {
        setLocalLoading(true);
        setLocalError(null);

        const result = await tradingApiService.createAlert(dto, userId);
        if (result.success && result.data) {
          // Real-time context will automatically update the alerts list
          return result.data;
        } else {
          setLocalError(result.error || "Failed to create alert");
          logger.error("Failed to create alert:", result.error);
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setLocalError(errorMessage);
        logger.error("Error creating alert:", error);
        return null;
      } finally {
        setLocalLoading(false);
      }
    },
    [userId]
  );

  const updateAlert = useCallback(
    async (
      id: string,
      dto: UpdateTradeAlertDto
    ): Promise<TradeAlertResponseDto | null> => {
      try {
        setLocalError(null);
        return await realtimeUpdateAlert(id, dto);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setLocalError(errorMessage);
        return null;
      }
    },
    [realtimeUpdateAlert]
  );

  const deleteAlert = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId || !userId.trim()) {
        logger.warn("Cannot delete alert: invalid userId");
        return false;
      }

      try {
        setLocalLoading(true);
        setLocalError(null);

        const result = await tradingApiService.deleteAlert(id, userId);
        if (result.success) {
          // Real-time context will automatically update the alerts list
          return true;
        } else {
          setLocalError(result.error || "Failed to delete alert");
          logger.error("Failed to delete alert:", result.error);
          return false;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setLocalError(errorMessage);
        logger.error("Error deleting alert:", error);
        return false;
      } finally {
        setLocalLoading(false);
      }
    },
    [userId]
  );

  return {
    alerts,
    isLoading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts,
    connectionStatus,
    lastUpdated,
    nextRetryAt,
  };
};
