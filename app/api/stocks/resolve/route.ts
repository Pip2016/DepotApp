import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Börsenkürzel je Ländercode der ISIN, falls Yahoo mehrere Handelsplätze liefert
const HOME_SUFFIX: Record<string, string> = {
  DE: '.DE', FR: '.PA', NL: '.AS', BE: '.BR', IT: '.MI', ES: '.MC', CH: '.SW', GB: '.L',
  DK: '.CO', SE: '.ST', NO: '.OL', FI: '.HE', AT: '.VI', CA: '.TO', JP: '.T', HK: '.HK',
};

// Bankbezeichnungen wie "INTEL CORP. DL-,001" oder "VOLKSWAGEN AG VZO O.N." auf den Firmennamen kürzen
function cleanName(name: string): string {
  return name
    .replace(/[\s.]+(DL|LS|EO|SF|NK|DK|YC|CD|O\.N\.|NA|INH|VZO|ST|NAM\.)(?=[\s\-\d,]|$)[\s\S]*$/i, '')
    .replace(/[.+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ISIN (oder Name) -> Yahoo-Symbol für Live-Kurse importierter Positionen
export async function GET(request: NextRequest) {
  const isin = request.nextUrl.searchParams.get('isin')?.trim().toUpperCase();
  const name = request.nextUrl.searchParams.get('q')?.trim();
  const fallback = name ? cleanName(name) : undefined;
  const query = isin || fallback;
  if (!query) return NextResponse.json({ error: 'isin oder q erforderlich' }, { status: 400 });

  try {
    // Yahoos Antwort passt nicht immer zum Schema der Bibliothek (typeDisp "Equity" statt "equity")
    const result = (await yahooFinance.search(query, { quotesCount: 10, newsCount: 0 }, { validateResult: false })) as {
      quotes?: Array<{ symbol?: string; shortname?: string; isYahooFinance?: boolean }>;
    };
    const quotes = (result.quotes ?? []).filter(
      (q): q is { symbol: string; shortname?: string } => typeof q.symbol === 'string' && q.isYahooFinance !== false
    );
    if (quotes.length === 0) return NextResponse.json({ symbol: null });

    const suffix = isin ? HOME_SUFFIX[isin.slice(0, 2)] : undefined;
    // US-Titel haben kein Suffix; sonst den Heimatmarkt bevorzugen
    const pick =
      (isin?.startsWith('US') && quotes.find((q) => !q.symbol.includes('.'))) ||
      (suffix && quotes.find((q) => q.symbol.endsWith(suffix))) ||
      quotes[0];
    return NextResponse.json({ symbol: pick.symbol, name: pick.shortname?.trim() });
  } catch (error) {
    console.error(`resolve ${query}:`, error);
    return NextResponse.json({ symbol: null }, { status: 502 });
  }
}
