
export class TradeAlert {
  constructor(
    public readonly id: string,
    public readonly assetName: string,
    public readonly tradermadeSymbol: string,
    public readonly tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit',
    public readonly entryPrice: number,
    public readonly stopLoss: number,
    public readonly userId: string,
    public readonly status: 'pending' | 'active' | 'closed' | 'partially_profited',
    public readonly tp1?: number,
    public readonly tp2?: number,
    public readonly tp3?: number,
    public readonly tp4?: number,
    public readonly tp5?: number,
    public readonly tpHits: number[] = [],
    public readonly notes?: string,
    public readonly closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired',
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  public canBeEditedBy(userId: string): boolean {
    return this.userId === userId;
  }

  public isActive(): boolean {
    return this.status === 'active';
  }

  public getRiskRewardRatio(): number | null {
    if (!this.tp1) return null;
    const risk = Math.abs(this.entryPrice - this.stopLoss);
    const reward = Math.abs(this.tp1 - this.entryPrice);
    return reward / risk;
  }
}
