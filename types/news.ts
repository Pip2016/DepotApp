export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image?: string;
  datetime: number;
  related: string;
}
