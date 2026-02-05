'use client';

import { ExternalLink } from 'lucide-react';
import { NewsArticle } from '@/types/news';
import { formatRelativeDate } from '@/lib/formatters/date';
import { Skeleton } from '@/components/ui/skeleton';

interface StockNewsProps {
  news: NewsArticle[];
  isLoading: boolean;
}

export function StockNews({ news, isLoading }: StockNewsProps) {
  if (isLoading) {
    return (
      <div className="card-shadow rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-lg font-semibold">News</h3>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-shadow rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-lg font-semibold text-card-foreground">News</h3>
      {news.length === 0 ? (
        <p className="text-muted-foreground">Keine aktuellen News verfügbar</p>
      ) : (
        <div className="space-y-4">
          {news.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-lg border border-border p-3 transition-colors hover:bg-muted"
            >
              <div className="flex items-start gap-3">
                {article.image && (
                  <img
                    src={article.image}
                    alt=""
                    className="h-16 w-24 flex-shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="line-clamp-2 text-sm font-medium text-card-foreground group-hover:text-primary">
                    {article.headline}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {article.summary}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{article.source}</span>
                    <span>·</span>
                    <span>{formatRelativeDate(article.datetime)}</span>
                    <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
