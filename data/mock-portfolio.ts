import { Portfolio } from '@/types/portfolio';

export const mockPortfolio: Portfolio = {
  id: '1',
  name: 'Mein Depot',
  positions: [
    {
      id: '1',
      symbol: 'AAPL',
      isin: 'US0378331005',
      wkn: '865985',
      name: 'Apple Inc.',
      quantity: 10,
      buyPrice: 150.00,
      buyDate: '2024-01-15',
      currency: 'USD',
    },
    {
      id: '2',
      symbol: 'SAP.DE',
      isin: 'DE0007164600',
      wkn: '716460',
      name: 'SAP SE',
      quantity: 25,
      buyPrice: 120.50,
      buyDate: '2024-03-20',
      currency: 'EUR',
    },
    {
      id: '3',
      symbol: 'IWDA.AS',
      isin: 'IE00B4L5Y983',
      name: 'iShares Core MSCI World',
      quantity: 50,
      buyPrice: 75.30,
      buyDate: '2023-06-01',
      currency: 'EUR',
    },
    {
      id: '4',
      symbol: 'MSFT',
      isin: 'US5949181045',
      wkn: '870747',
      name: 'Microsoft Corp.',
      quantity: 8,
      buyPrice: 310.00,
      buyDate: '2024-02-10',
      currency: 'USD',
    },
    {
      id: '5',
      symbol: 'ALV.DE',
      isin: 'DE0008404005',
      wkn: '840400',
      name: 'Allianz SE',
      quantity: 15,
      buyPrice: 230.00,
      buyDate: '2024-05-15',
      currency: 'EUR',
    },
  ],
  createdAt: '2024-01-01',
  updatedAt: '2024-12-01',
};

// Mock stock quotes for development when API is not available
export const mockStockQuotes: Record<string, { price: number; change: number; changePercent: number; name: string }> = {
  'AAPL': { price: 178.50, change: 2.30, changePercent: 1.31, name: 'Apple Inc.' },
  'SAP.DE': { price: 175.20, change: -1.80, changePercent: -1.02, name: 'SAP SE' },
  'IWDA.AS': { price: 82.45, change: 0.65, changePercent: 0.79, name: 'iShares Core MSCI World' },
  'MSFT': { price: 415.80, change: 5.20, changePercent: 1.27, name: 'Microsoft Corp.' },
  'ALV.DE': { price: 268.50, change: 3.10, changePercent: 1.17, name: 'Allianz SE' },
};
