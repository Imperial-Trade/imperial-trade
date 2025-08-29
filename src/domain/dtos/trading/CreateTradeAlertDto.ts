
import { TradeAlertStatus, TradeAlertCloseReason, TradeType } from '@/types/trading';

export interface CreateTradeAlertDto {
  assetName: string;
  tradermadeSymbol: string;
  tradeType: TradeType;
  entryPrice: number;
  stopLoss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  notes?: string;
}

export interface UpdateTradeAlertDto {
  status?: TradeAlertStatus;
  tpHits?: number[];
  closeReason?: TradeAlertCloseReason;
  notes?: string;
}

export interface TradeAlertResponseDto {
  id: string;
  userId: string;
  assetName: string;
  tradermadeSymbol: string;
  tradeType: TradeType;
  entryPrice: number;
  stopLoss: number;
  status: TradeAlertStatus;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tpHits: number[];
  notes?: string;
  closeReason?: TradeAlertCloseReason;
  createdAt: string;
  updatedAt: string;
}
