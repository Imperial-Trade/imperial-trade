// Market data types for components that still need basic interfaces
export interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
  dataSource?: 'tradermade' | 'mock';
  dataQuality?: 'real_time' | 'delayed' | 'simulated';
}

export interface HistoricalDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataRequest {
  symbols: string[];
  includeVolume?: boolean;
}

export interface HistoricalDataRequest {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  startDate: string;
  endDate: string;
}