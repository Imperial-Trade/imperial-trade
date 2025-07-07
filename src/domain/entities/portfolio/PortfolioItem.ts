
export class PortfolioItem {
  constructor(
    public readonly id: string,
    public readonly assetName: string,
    public readonly ticker: string,
    public readonly assetType: 'Stock' | 'Crypto' | 'Forex' | 'Commodity',
    public readonly quantity: number,
    public readonly avgBuyPrice: number,
    public readonly userId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  public getCurrentValue(currentPrice: number): number {
    return this.quantity * currentPrice;
  }

  public getPnL(currentPrice: number): number {
    return (currentPrice - this.avgBuyPrice) * this.quantity;
  }

  public getPnLPercentage(currentPrice: number): number {
    return ((currentPrice - this.avgBuyPrice) / this.avgBuyPrice) * 100;
  }

  public canBeEditedBy(userId: string): boolean {
    return this.userId === userId;
  }
}
