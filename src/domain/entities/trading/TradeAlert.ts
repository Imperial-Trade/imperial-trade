
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
    public readonly closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp',
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  canBeEditedBy(userId: string): boolean {
    return this.userId === userId;
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  isClosed(): boolean {
    return this.status === 'closed';
  }

  hasPartialProfits(): boolean {
    return this.status === 'partially_profited' && this.tpHits.length > 0;
  }
}
