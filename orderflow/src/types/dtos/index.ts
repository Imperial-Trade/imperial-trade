
// Export all DTOs from existing domain structure
export * from '@/domain/dtos/trading/CreateTradeAlertDto';
export * from '@/domain/dtos/portfolio/CreatePortfolioItemDto';
export * from '@/domain/dtos/forum/CreateForumPostDto';

// Common types that should be centralized
export interface BaseEntityDto {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface UserOwnedEntityDto extends BaseEntityDto {
  user_id: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form state with proper constraints
export interface FormState<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T;
  errors: FormError[];
  isSubmitting: boolean;
  isValid: boolean;
}

export interface FormError {
  field: string;
  message: string;
}

// Table component types with proper constraints
export interface TableColumn<T extends Record<string, unknown> = Record<string, unknown>> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  render?: (value: unknown, record: T) => React.ReactNode;
}

export interface TableProps<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

// Notification system with strict typing
export interface NotificationDto {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'trade_closed' | 'tp_hit' | 'stop_loss' | 'trade_activated';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// Filter options with improved typing
export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  options?: SelectOption[];
  defaultValue?: string | number | boolean | Date;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
