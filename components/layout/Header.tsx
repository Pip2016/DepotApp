'use client';

import { Bell, Search } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserMenu } from '@/components/auth/UserMenu';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/stock/${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      {/* Spacer for mobile menu button */}
      <div className="w-10 md:hidden" />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Aktie oder ETF suchen (z.B. AAPL, SAP.DE)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-5 w-5" />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
