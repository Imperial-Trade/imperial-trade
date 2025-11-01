
export interface CreatePortfolioItemDto {
  assetName: string;
  ticker: string;
  assetType: 'Stock' | 'Crypto' | 'Forex' | 'Commodity';
  quantity: number;
  avgBuyPrice: number;
}

export interface UpdatePortfolioItemDto {
  quantity?: number;
  avgBuyPrice?: number;
}

export interface PortfolioItemResponseDto {
  id: string;
  assetName: string;
  ticker: string;
  assetType: 'Stock' | 'Crypto' | 'Forex' | 'Commodity';
  quantity: number;
  avgBuyPrice: number;
  createdAt: string;
  updatedAt: string;
}
