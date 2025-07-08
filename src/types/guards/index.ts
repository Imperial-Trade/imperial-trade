
import { VideoDto } from '../dtos/learning';
import { TradeAlertDto } from '../dtos/trading';
import { AccountRequestDto } from '../dtos/admin';
import { NotificationDto } from '../dtos/common';

// Video type guard
export function isValidVideoData(data: unknown): data is VideoDto {
  if (!data || typeof data !== 'object') return false;
  const video = data as Record<string, unknown>;
  
  return (
    typeof video.id === 'string' &&
    typeof video.title === 'string' &&
    typeof video.video_url === 'string' &&
    typeof video.created_at === 'string' &&
    typeof video.updated_at === 'string'
  );
}

// Trade Alert type guard
export function isValidTradeAlertData(data: unknown): data is TradeAlertDto {
  if (!data || typeof data !== 'object') return false;
  const alert = data as Record<string, unknown>;
  
  return (
    typeof alert.id === 'string' &&
    typeof alert.asset_name === 'string' &&
    typeof alert.finnhub_symbol === 'string' &&
    typeof alert.entry_price === 'number' &&
    typeof alert.stop_loss === 'number' &&
    ['buy', 'sell'].includes(alert.trade_type as string) &&
    ['active', 'pending', 'closed'].includes(alert.status as string)
  );
}

// Account Request type guard
export function isValidAccountRequestData(data: unknown): data is AccountRequestDto {
  if (!data || typeof data !== 'object') return false;
  const request = data as Record<string, unknown>;
  
  return (
    typeof request.id === 'string' &&
    typeof request.full_name === 'string' &&
    typeof request.email === 'string' &&
    ['user', 'admin'].includes(request.account_type as string) &&
    ['pending', 'approved', 'rejected'].includes(request.status as string)
  );
}

// Notification type guard
export function isValidNotificationData(data: unknown): data is NotificationDto {
  if (!data || typeof data !== 'object') return false;
  const notification = data as Record<string, unknown>;
  
  return (
    typeof notification.id === 'string' &&
    typeof notification.title === 'string' &&
    typeof notification.message === 'string' &&
    ['success', 'error', 'warning', 'info', 'trade_closed', 'tp_hit', 'stop_loss', 'trade_activated'].includes(notification.type as string)
  );
}

// Generic error type guard
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Supabase error type guard
export function isSupabaseError(error: unknown): error is { message: string; code?: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}
