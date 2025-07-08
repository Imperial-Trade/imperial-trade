
// Common type definitions used across the application

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface UserOwnedEntity extends BaseEntity {
  user_id: string;
}

// Trading related types
export interface TradingPair {
  symbol: string;
  base: string;
  quote: string;
  price: number;
  change24h: number;
  volume24h: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  change: number;
  changePercent: number;
}

// Form types with better constraints
export interface FormError {
  field: string;
  message: string;
}

export interface FormState<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T;
  errors: FormError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// UI Component types with better constraints
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

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

// Chart types
export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

// Notification types - using strict typing
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// File upload types
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  upload_date: string;
}

export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// Search and filter types with better constraints
export interface SearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  options?: SelectOption[];
  defaultValue?: string | number | boolean | Date;
}

// Generic utility types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Event handler types
export type EventHandler<T = Event> = (event: T) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void;
export type SubmitHandler<T = HTMLFormElement> = (event: React.FormEvent<T>) => void;

// API endpoint types
export interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  authenticated?: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// State management types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface AsyncState<T> extends LoadingState {
  data: T | null;
}

// Component prop types
export interface ComponentWithChildren {
  children: React.ReactNode;
}

export interface ComponentWithClassName {
  className?: string;
}

export interface ComponentWithTestId {
  testId?: string;
}

export type BaseComponentProps = ComponentWithChildren & ComponentWithClassName & ComponentWithTestId;
