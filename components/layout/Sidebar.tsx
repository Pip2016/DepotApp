'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Upload,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    icon: Briefcase,
  },
  {
    label: 'CSV Import',
    href: '/import',
    icon: Upload,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-card p-2 shadow-md md:hidden"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground">MyDepot</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            MyDepot v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
