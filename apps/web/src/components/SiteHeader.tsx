'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './Logo';

const PARENT_NAV = [
  { href: '/#nasil-calisir', label: 'Nasıl Çalışır' },
  { href: '/#sss', label: 'SSS' },
  { href: '/servisciler', label: 'Servisçi misiniz?' },
  { href: '/iletisim', label: 'İletişim' },
];

const PROVIDER_NAV = [
  { href: '/servisciler#neden', label: 'Neden Katılmalıyım' },
  { href: '/servisciler#nasil', label: 'Nasıl Katılırım' },
  { href: '/servisciler#sss', label: 'SSS' },
  { href: '/', label: 'Anasayfa (Veliler)' },
  { href: '/iletisim', label: 'İletişim' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '/';
  const isProviderArea =
    pathname.startsWith('/servisciler') || pathname === '/servisciler';

  const nav = isProviderArea ? PROVIDER_NAV : PARENT_NAV;
  const primaryCtaHref = isProviderArea ? '/servisci/kayit' : '/teklif-al';
  const primaryCtaLabel = isProviderArea ? 'Servisçi Kaydı' : 'Teklif Al';
  const loginHref = isProviderArea ? '/servisci/giris' : '/veli/giris';
  const loginLabel = isProviderArea ? 'Servisçi Girişi' : 'Veli Girişi';

  return (
    <header className="sticky top-0 z-40 border-b border-charcoal-100/60 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={loginHref}
            className="hidden text-sm font-medium text-charcoal-700 hover:text-charcoal-900 md:inline"
          >
            {loginLabel}
          </Link>
          <Link href={primaryCtaHref} className="btn-primary">
            {primaryCtaLabel}
          </Link>
          <button
            aria-label="Menü"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-charcoal-200 text-charcoal-700 md:hidden"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-charcoal-100 bg-white md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-6 py-4">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-sand-50"
              >
                {n.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-charcoal-100" />
            <Link
              href={loginHref}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-sand-50"
            >
              {loginLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
