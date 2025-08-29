
import { TradeAlert } from '../../entities/trading/TradeAlert';
import { CreateTradeAlertDto, UpdateTradeAlertDto } from '../../dtos/trading/CreateTradeAlertDto';
import { TradeAlertStatus } from '@/types/trading';

export interface ITradingRepository {
  findAllAlerts(userId: string): Promise<TradeAlert[]>;
  findAlertById(id: string): Promise<TradeAlert | null>;
  findAlertsByStatus(status: TradeAlertStatus, userId: string): Promise<TradeAlert[]>;
  createAlert(dto: CreateTradeAlertDto, userId: string): Promise<TradeAlert>;
  updateAlert(id: string, dto: UpdateTradeAlertDto): Promise<TradeAlert>;
  deleteAlert(id: string): Promise<void>;
}
