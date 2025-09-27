export interface SignalCounts {
  all: number;
  active: number;
  closed: number;
  pending: number;
  buy: number;
  sell: number;
}

export interface FilterState {
  status: string;
  type: string;
  tradeType: string;
  educator: string;
  asset: string;
  search: string;
}

export interface EducatorOption {
  value: string;
  label: string;
}