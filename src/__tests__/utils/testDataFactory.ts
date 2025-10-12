
import { AdminUser } from '@/hooks/useAdminUserManagement';
import { TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { TradeAlertData } from '@/types/components';

export class TestDataFactory {
  static createMockUser(overrides: Partial<AdminUser> = {}): AdminUser {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      display_name: 'Test User',
      role: 'user',
      user_type: 'user',
      access_level: 'user',
      account_status: 'active',
      registration_source: 'direct',
      created_at: '2024-01-01T00:00:00Z',
      ...overrides
    };
  }

  static createMockAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
    return this.createMockUser({
      email: 'admin@example.com',
      display_name: 'Admin User',
      role: 'admin',
      user_type: 'admin',
      access_level: 'admin',
      ...overrides
    });
  }

  static createMockTradeAlert(overrides: Partial<TradeAlertResponseDto> = {}): TradeAlertResponseDto {
    return {
      id: '456e7890-f12b-34c5-d678-901234567890',
      userId: 'user-123e4567-e89b-12d3-a456-426614174000',
      assetName: 'EUR/USD',
      tradermadeSymbol: 'EURUSD',
      tradeType: 'buy',
      entryPrice: 1.0500,
      stopLoss: 1.0450,
      status: 'active',
      tp1: 1.0550,
      tp2: 1.0600,
      tpHits: [],
      notes: 'Test trade alert',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...overrides
    };
  }

  // New method for creating TradeAlertData format used by components
  static createMockTradeAlertData(overrides: Partial<TradeAlertData> = {}): TradeAlertData {
    return {
      id: '456e7890-f12b-34c5-d678-901234567890',
      asset_name: 'EUR/USD',
      tradermade_symbol: 'EURUSD',
      trade_type: 'buy',
      entry_price: 1.0500,
      stop_loss: 1.0450,
      status: 'active',
      tp1: 1.0550,
      tp2: 1.0600,
      tp_hits: [],
      notes: 'Test trade alert',
      created_date: '2024-01-01T00:00:00Z',
      updated_date: '2024-01-01T00:00:00Z',
      ...overrides
    };
  }

  static createMockSupabaseUser(overrides: any = {}) {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {
        access_level: 'user',
        role: 'user'
      },
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
      ...overrides
    };
  }

  static createMockProfile(overrides: any = {}) {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      display_name: 'Test User',
      role: 'user',
      user_type: 'user',
      access_level: 'user',
      account_status: 'active',
      registration_source: 'direct',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides
    };
  }

  static createMockApiResponse<T>(data: T, success = true, error?: string) {
    return {
      success,
      data: success ? data : undefined,
      error: success ? undefined : error
    };
  }

  static createMockUsers(count: number): AdminUser[] {
    return Array.from({ length: count }, (_, index) =>
      this.createMockUser({
        id: `user-${index + 1}`,
        email: `user${index + 1}@test.com`,
        display_name: `User ${index + 1}`
      })
    );
  }

  static createMockTradeAlerts(count: number): TradeAlertResponseDto[] {
    const assets = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
    const tradeTypes = ['buy', 'sell'] as const;
    const statuses = ['active', 'closed', 'pending'] as const;

    return Array.from({ length: count }, (_, index) =>
      this.createMockTradeAlert({
        id: `alert-${index + 1}`,
        userId: `user-${index + 1}`,
        assetName: assets[index % assets.length],
        tradeType: tradeTypes[index % tradeTypes.length],
        status: statuses[index % statuses.length],
        entryPrice: 1.0500 + (index * 0.0010),
        stopLoss: 1.0450 + (index * 0.0010),
      })
    );
  }

  // New method for creating multiple TradeAlertData objects
  static createMockTradeAlertDataList(count: number): TradeAlertData[] {
    const assets = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
    const tradeTypes = ['buy', 'sell'] as const;
    const statuses = ['active', 'closed', 'pending'] as const;

    return Array.from({ length: count }, (_, index) =>
      this.createMockTradeAlertData({
        id: `alert-${index + 1}`,
        asset_name: assets[index % assets.length],
        trade_type: tradeTypes[index % tradeTypes.length],
        status: statuses[index % statuses.length],
        entry_price: 1.0500 + (index * 0.0010),
        stop_loss: 1.0450 + (index * 0.0010),
      })
    );
  }

  static createMockWebSocketMessage(type: string, data: any) {
    return {
      event: type,
      payload: data,
      timestamp: Date.now()
    };
  }

  static createMockErrorResponse(message: string) {
    return this.createMockApiResponse(null, false, message);
  }

  static createMockLoadingState() {
    return {
      loading: true,
      data: undefined,
      error: undefined
    };
  }

  static createMockSuccessState<T>(data: T) {
    return {
      loading: false,
      data,
      error: undefined
    };
  }

  static createMockErrorState(error: string) {
    return {
      loading: false,
      data: undefined,
      error
    };
  }
}
