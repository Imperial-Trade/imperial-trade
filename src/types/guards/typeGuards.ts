
import { ApiResponse, NotificationDto, FormError } from '../dtos/index';

// Type guards for runtime validation
export function isApiResponse<T>(data: unknown): data is ApiResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    typeof (data as any).success === 'boolean'
  );
}

export function isNotificationDto(data: unknown): data is NotificationDto {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'type' in data &&
    'title' in data &&
    'message' in data &&
    typeof (data as any).id === 'string' &&
    typeof (data as any).title === 'string' &&
    typeof (data as any).message === 'string' &&
    ['success', 'error', 'warning', 'info', 'trade_closed', 'tp_hit', 'stop_loss', 'trade_activated'].includes((data as any).type)
  );
}

export function isFormError(data: unknown): data is FormError {
  return (
    typeof data === 'object' &&
    data !== null &&
    'field' in data &&
    'message' in data &&
    typeof (data as any).field === 'string' &&
    typeof (data as any).message === 'string'
  );
}

export function isTradeAlertData(data: unknown): data is any {
  return (
    typeof data === 'object' &&
    data !== null &&
    'assetName' in data &&
    'finnhubSymbol' in data &&
    'tradeType' in data &&
    'entryPrice' in data &&
    'stopLoss' in data
  );
}

export function isPortfolioItemData(data: unknown): data is any {
  return (
    typeof data === 'object' &&
    data !== null &&
    'assetName' in data &&
    'ticker' in data &&
    'assetType' in data &&
    'quantity' in data &&
    'avgBuyPrice' in data
  );
}

export function isVideoData(data: unknown): data is any {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'title' in data &&
    'video_url' in data &&
    typeof (data as any).id === 'string' &&
    typeof (data as any).title === 'string' &&
    typeof (data as any).video_url === 'string'
  );
}
