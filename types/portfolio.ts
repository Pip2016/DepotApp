export interface Position {
  id: string;
  symbol: string;
  isin?: string;
  wkn?: string;
  name: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  currentPrice?: number;
  currency: 'EUR' | 'USD';
}

export interface Portfolio {
  id: string;
  name: string;
  positions: Position[];
  createdAt: string;
  updatedAt: string;
}
