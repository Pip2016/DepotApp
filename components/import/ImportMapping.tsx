'use client';

import { ParsedPosition } from '@/lib/csv/types';
import { Position } from '@/types/portfolio';

interface ImportMappingProps {
  parsedPositions: ParsedPosition[];
}

export function mapParsedToPositions(
  parsed: ParsedPosition[]
): Omit<Position, 'id'>[] {
  return parsed.map((p) => ({
    symbol: isinToSymbol(p.isin) || p.isin,
    isin: p.isin,
    wkn: p.wkn,
    name: p.name,
    quantity: p.quantity,
    buyPrice: p.buyPrice ?? p.currentPrice ?? 0,
    buyDate: new Date().toISOString().split('T')[0],
    currency: (p.currency === 'EUR' || p.currency === 'USD' ? p.currency : 'EUR') as 'EUR' | 'USD',
  }));
}

// Simple ISIN to symbol mapping for common German stocks/ETFs
// In a production app, this would use a real lookup API
const ISIN_SYMBOL_MAP: Record<string, string> = {
  'US0378331005': 'AAPL',
  'US5949181045': 'MSFT',
  'US0231351067': 'AMZN',
  'US02079K3059': 'GOOGL',
  'DE0007164600': 'SAP.DE',
  'DE0007100000': 'DAI.DE',
  'DE0005190003': 'BMW.DE',
  'DE0008404005': 'ALV.DE',
  'DE0007236101': 'SIE.DE',
  'DE000BASF111': 'BAS.DE',
  'IE00B4L5Y983': 'IWDA.AS',
  'IE00B0M62Q58': 'IQQW.DE',
  'LU0392494562': 'DBXD.DE',
};

function isinToSymbol(isin: string): string | null {
  return ISIN_SYMBOL_MAP[isin] || null;
}

export function ImportMapping({ parsedPositions }: ImportMappingProps) {
  const mapped = mapParsedToPositions(parsedPositions);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        Zuordnung prüfen
      </h3>
      <p className="text-sm text-muted-foreground">
        Überprüfe die automatische Zuordnung der Symbole.
      </p>
      <div className="space-y-2">
        {mapped.map((pos, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <div>
              <p className="font-medium">{pos.name}</p>
              <p className="text-xs text-muted-foreground">
                ISIN: {pos.isin}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-medium text-primary">
                {pos.symbol}
              </p>
              <p className="text-xs text-muted-foreground">
                {pos.quantity} Stück
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
