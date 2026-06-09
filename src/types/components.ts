
// Component-specific type definitions for better UI type safety
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

// Base component props with strict typing
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  testId?: string;
}

// Form Types - Adding missing exports
export interface FormError {
  field: string;
  message: string;
}

export interface FormState<T extends Record<string, unknown>> {
  data: T;
  errors: FormError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// Trading Alert Component Types
export interface TradeAlertData {
  id: string;
  asset_name: string;
  tradermade_symbol: string;
  trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entry_price: number;
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  tp_hits?: number[];
  close_reason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp' | 'all_tps_hit' | 'expired';
  notes?: string;
  created_date: string;
  updated_date?: string;
}

export interface TradeAlertCardProps extends BaseComponentProps {
  alert: TradeAlertData;
  onStatusUpdate: (alert: TradeAlertData, newStatus: string) => Promise<void>;
  onTakeProfitHit: (alert: TradeAlertData, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string | null) => Promise<void>;
  onStopLossHit: (alert: TradeAlertData, closeReason: string) => Promise<void>;
  onOrderActivation: (alert: TradeAlertData) => Promise<void>;
  /** When set, bypasses `close_trade_alert` RPC (e.g. Insight room signals). */
  onCloseWithReason?: (reason: string) => Promise<void>;
  /** When set, bypasses trade-alerts API for notes (e.g. Insight room signals). */
  onNotesSave?: (notes: string) => Promise<void>;
  isAdmin: boolean;
  isCreator: boolean;
  livePrice?: number;
  connectionStatus: 'connecting' | 'connected' | 'error' | 'polling';
  priceSource: string;
  isRecentClosure: boolean;
  timestampRefreshKey?: number;
  /** Compact layout for Insight chat (`max-w-[85%]` clusters). */
  compact?: boolean;
}

// Live Price Widget Types
export interface LivePriceWidgetProps extends BaseComponentProps {
  alert: TradeAlertData;
  onTakeProfitHit: (alert: TradeAlertData, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string | null) => Promise<void>;
  onStopLossHit: (alert: TradeAlertData, closeReason: string) => Promise<void>;
  onOrderActivation: (alert: TradeAlertData) => Promise<void>;
  livePrice?: number;
  connectionStatus: 'connecting' | 'connected' | 'error' | 'polling';
  priceSource: string;
  compact?: boolean;
}

// Trading Calculator Types
export interface TradingCalculatorProps extends BaseComponentProps {
  alert: TradeAlertData;
  livePrice?: number;
}

// Quick Copy Panel Types - Updated to support all trade types
export interface QuickCopyPanelProps extends BaseComponentProps {
  alert: {
    asset_name: string;
    trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
    entry_price: number;
    stop_loss: number;
    tp1?: number;
    tp2?: number;
    tp3?: number;
    tp4?: number;
    tp5?: number;
  };
}

// Trade Status Badge Types
export interface TradeStatusBadgeProps extends BaseComponentProps {
  alert: {
    status: 'pending' | 'active' | 'closed' | 'partially_profited';
    tp_hits?: number[];
    close_reason?: string;
  };
  updatedDate?: string;
  isRecentClosure?: boolean;
}

// Form Types with strict validation
export interface FormFieldProps extends BaseComponentProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

// Navigation Types
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
  children?: NavigationItem[];
}

export interface NavigationProps extends BaseComponentProps {
  items: NavigationItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed?: boolean;
}

// Notification Types - Enhanced from common types
export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'trade_closed' | 'tp_hit' | 'stop_loss' | 'trade_activated';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
  actions?: Array<{
    label: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
    onClick: () => void;
  }>;
}

export interface NotificationSystemProps extends BaseComponentProps {
  maxNotifications?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Real-time Connection Types
export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: number;
  reconnectAttempts?: number;
  error?: string;
}

export interface PriceFeedData {
  symbol: string;
  price: number;
  timestamp: number;
  change?: number;
  changePercent?: number;
  volume?: number;
}

export interface PriceFeedProps extends BaseComponentProps {
  symbols: string[];
  onPriceUpdate?: (data: PriceFeedData) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
  reconnectInterval?: number;
}

// Modal and Dialog Types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export interface ConfirmDialogProps extends ModalProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

// Loading and Error States
export interface LoadingStateProps extends BaseComponentProps {
  isLoading: boolean;
  error?: string | null;
  retry?: () => void;
  loadingText?: string;
  emptyText?: string;
  children: ReactNode;
}

// Table Component Types - Enhanced
export interface TableColumn<T extends Record<string, unknown> = Record<string, unknown>> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, record: T, index: number) => ReactNode;
  className?: string;
}

export interface TableProps<T extends Record<string, unknown> = Record<string, unknown>> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyText?: string;
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
  sorting?: {
    column: keyof T;
    direction: 'asc' | 'desc';
    onChange: (column: keyof T, direction: 'asc' | 'desc') => void;
  };
}

// Search and Filter Types - Enhanced
export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean';
  options?: Array<{ value: string; label: string; count?: number }>;
  placeholder?: string;
  defaultValue?: unknown;
  validation?: (value: unknown) => string | null;
}

export interface SearchFilterProps extends BaseComponentProps {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
  onSearch: () => void;
  isLoading?: boolean;
}

// Event Handler Types - More specific
export type ComponentEventHandler<T = Event> = (event: T) => void | Promise<void>;
export type FormEventHandler<T = HTMLFormElement> = (event: React.FormEvent<T>) => void | Promise<void>;
export type ChangeEventHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type ClickEventHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void | Promise<void>;
export type KeyboardEventHandler<T = HTMLElement> = (event: React.KeyboardEvent<T>) => void;

// Utility Types for Components
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentVariant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
export type ComponentState = 'idle' | 'loading' | 'success' | 'error';

// Component Ref Types
export interface ComponentRef {
  focus: () => void;
  blur: () => void;
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
}

export interface FormRef extends ComponentRef {
  submit: () => void;
  reset: () => void;
  validate: () => boolean;
  getValues: () => Record<string, unknown>;
  setValues: (values: Record<string, unknown>) => void;
}
