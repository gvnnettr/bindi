'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBranding } from '@/lib/branding';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export function AppShell({
  brand,
  subtitle,
  nav,
  onSignOut,
  children,
  topRight,
}: {
  brand: string;
  subtitle: string;
  nav: NavItem[];
  onSignOut: () => void;
  children: React.ReactNode;
  topRight?: React.ReactNode;
}) {
  const pathname = usePathname();
  const branding = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  const isRoot = (href: string) =>
    href === '/admin' || href === '/servisci' || href === '/veli';
  const matches = (href: string) =>
    isRoot(href) ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  const current =
    [...nav].sort((a, b) => b.href.length - a.href.length).find((n) => matches(n.href)) ??
    nav.find((n) => matches(n.href));

  return (
    <div className="flex min-h-screen bg-sand-50">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-charcoal-900/50 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        className={
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-charcoal-900 text-charcoal-100 transition-transform duration-200 md:z-30 md:translate-x-0 ' +
          (mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')
        }
      >
        <div className="flex min-h-16 items-center gap-3 px-4 py-3">
          {branding.logoFooterUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logoFooterUrl}
                alt={branding.siteName || brand}
                className="h-12 w-auto"
              />
              <span className="text-[10px] font-medium uppercase tracking-widest text-charcoal-400">
                {subtitle}
              </span>
            </>
          ) : (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sunset-500 text-white shadow-sm">
                <span className="text-lg font-black leading-none">
                  {(branding.siteName || brand).slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-extrabold text-white tracking-tight">
                  {branding.siteName || brand}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-charcoal-400">
                  {subtitle}
                </span>
              </div>
            </>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => {
            const active = matches(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ' +
                  (active
                    ? 'bg-sunset-500 text-white shadow-sm'
                    : 'text-charcoal-300 hover:bg-white/5 hover:text-white')
                }
              >
                <span className={active ? 'text-white' : 'text-charcoal-400 group-hover:text-white'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                      (active
                        ? 'bg-white/20 text-white'
                        : 'bg-sunset-500/20 text-sunset-300')
                    }
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-4">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-charcoal-400 transition hover:bg-white/5 hover:text-white"
            onClick={onSignOut}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex-1 md:pl-64">
        <header className="sticky top-0 z-20 border-b border-charcoal-100 bg-white/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
            <button
              type="button"
              aria-label="Menüyü aç"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-charcoal-200 text-charcoal-700 hover:bg-sand-50 md:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold uppercase tracking-widest text-charcoal-400">
                {subtitle}
              </div>
              <div className="truncate text-lg font-bold text-charcoal-900">
                {current?.label ?? 'Panel'}
              </div>
            </div>
            <div className="flex flex-none items-center gap-3">{topRight}</div>
          </div>
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

export const Icons = {
  Dashboard: (
    <svg className="h-4.5 w-4.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  Inbox: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  ),
  School: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Package: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  ),
  Truck: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Offer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <path d="M7 7h.01" />
    </svg>
  ),
  Settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};
