import { ReactNode, JSXElementConstructor, ReactElement, ReactPortal } from 'react';

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  retry?: () => void;
}

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
  tp_hits: number[];
  notes?: string;
  close_reason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'expired' | 'reversal_after_tp';
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  created_date?: string;
  updated_date?: string;
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string;
    user_type?: string;
    access_level?: string;
  };
}

export interface TradeAlertCardProps extends BaseComponentProps {
  alert: TradeAlertData;
  currentPrice?: number;
  updatesInProgress?: Set<string>;
  onStatusUpdate: (alert: TradeAlertData, newStatus: string) => Promise<void>;
  onTakeProfitHit: (alert: TradeAlertData, tpLevel: number) => Promise<void>;
  onStopLossHit: (alert: TradeAlertData) => Promise<void>;
  onActivateOrder?: (alert: TradeAlertData) => Promise<void>;
  livePrice?: number;
  isRecentClosure?: boolean;
  onOrderActivation?: () => Promise<void>;
  isAdmin?: boolean;
  isCreator?: boolean;
  connectionStatus?: string;
  priceSource?: string;
  testId?: string;
}

// Additional common component interfaces
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export interface InputProps extends BaseComponentProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

// Table component types
export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: number | string;
}

export interface TableProps<T> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (record: T, index: number) => void;
}

// Navigation component types
export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  active?: boolean;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Form component types
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  error?: string;
  required?: boolean;
  helpText?: string;
}

// Card component types
export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  bordered?: boolean;
  hoverable?: boolean;
}

// Alert/Toast component types
export interface AlertProps extends BaseComponentProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  closable?: boolean;
  onClose?: () => void;
}

// Badge component types
export interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

// Progress component types
export interface ProgressProps extends BaseComponentProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

// Tabs component types
export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps extends BaseComponentProps {
  items: TabItem[];
  activeKey?: string;
  onChange?: (key: string) => void;
  variant?: 'default' | 'pills' | 'underline';
}

// Dropdown component types
export interface DropdownItem {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

export interface DropdownProps extends BaseComponentProps {
  items: DropdownItem[];
  trigger?: ReactNode;
  placement?: 'bottom' | 'top' | 'left' | 'right';
}

// Menu component types
export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  children?: MenuItem[];
  disabled?: boolean;
}

export interface MenuProps extends BaseComponentProps {
  items: MenuItem[];
  mode?: 'horizontal' | 'vertical';
  selectedKeys?: string[];
  onSelect?: (keys: string[]) => void;
}

// Upload component types
export interface UploadFile {
  uid: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  url?: string;
  thumbUrl?: string;
  size?: number;
  type?: string;
}

export interface UploadProps extends BaseComponentProps {
  accept?: string;
  multiple?: boolean;
  maxCount?: number;
  maxSize?: number;
  onUpload?: (files: FileList) => Promise<void>;
  onChange?: (files: UploadFile[]) => void;
}

// Date picker component types
export interface DatePickerProps extends BaseComponentProps {
  value?: Date;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  format?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

// Time picker component types
export interface TimePickerProps extends BaseComponentProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  format?: '12' | '24';
  disabled?: boolean;
}

// Search component types
export interface SearchProps extends BaseComponentProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

// Pagination component types
export interface PaginationProps extends BaseComponentProps {
  current: number;
  total: number;
  pageSize?: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  onChange?: (page: number, pageSize?: number) => void;
}

// Tree component types
export interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  disabled?: boolean;
  icon?: ReactNode;
}

export interface TreeProps extends BaseComponentProps {
  data: TreeNode[];
  selectedKeys?: string[];
  expandedKeys?: string[];
  onSelect?: (keys: string[], node: TreeNode) => void;
  onExpand?: (keys: string[], node: TreeNode) => void;
}

// Live Price Widget Props
export interface LivePriceWidgetProps {
  symbol: string;
  price?: number;
  className?: string;
  compact?: boolean;
}

// Form context types
export interface FormContextValue<T = Record<string, unknown>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  setFieldValue: (field: keyof T, value: unknown) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  validateField: (field: keyof T) => Promise<void>;
  submitForm: () => Promise<void>;
  resetForm: () => void;
  setValues: (values: Record<string, unknown>) => void;
}