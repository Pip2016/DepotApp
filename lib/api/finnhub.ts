import { FinnhubNewsResponse } from './types';
import { NewsArticle } from '@/types/news';

const BASE_URL = 'https://finnhub.io/api/v1';

export async function getCompanyNews(
  symbol: string,
  apiKey: string
): Promise<NewsArticle[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const response = await fetch(
      `${BASE_URL}/company-news?symbol=${encodeURIComponent(symbol)}&from=${weekAgo}&to=${today}&token=${apiKey}`,
      { next: { revalidate: 600 } }
    );

    if (!response.ok) {
      // 403 = rate limit or unsupported, 429 = rate limit - just return empty, don't spam logs
      if (response.status === 403 || response.status === 429) {
        console.log(`[News] Finnhub rate limited or unsupported for ${symbol}`);
        return [];
      }
      console.warn(`[News] Finnhub API error ${response.status} for ${symbol}`);
      return [];
    }

    const data: FinnhubNewsResponse[] = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.slice(0, 20).map((article) => ({
      id: String(article.id),
      headline: article.headline,
      summary: article.summary,
      source: article.source,
      url: article.url,
      image: article.image || undefined,
      datetime: article.datetime,
      related: article.related,
    }));
  } catch (error) {
    // Network errors etc - just log and return empty
    console.log(`[News] Failed to fetch news for ${symbol}`);
    return [];
  }
}
