
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
    public readonly closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp',
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

  // Critical: Check if all available TPs have been hit
  hasAllTpsHit(): boolean {
    const availableTPs = [this.tp1, this.tp2, this.tp3, this.tp4, this.tp5]
      .map((tp, index) => tp ? index + 1 : null)
      .filter(Boolean) as number[];
    
    if (availableTPs.length === 0) return false;
    
    // Clean duplicate hits and check if all available TPs are covered
    const uniqueHits = [...new Set(this.tpHits)];
    return availableTPs.every(tpLevel => uniqueHits.includes(tpLevel));
  }

  // Get cleaned TP hits without duplicates
  getCleanedTpHits(): number[] {
    return [...new Set(this.tpHits)].sort((a, b) => a - b);
  }
}
