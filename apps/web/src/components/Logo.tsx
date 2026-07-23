'use client';

import Link from 'next/link';
import { useBranding } from '@/lib/branding';

export function Logo({
  variant = 'light',
  size = 'md',
}: {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
}) {
  const branding = useBranding();
  const logoUrl =
    variant === 'light' ? branding.logoHeaderUrl : branding.logoFooterUrl;

  if (logoUrl) {
    return (
      <Link href="/" className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={branding.siteName}
          className={size === 'sm' ? 'h-12 w-auto' : 'h-16 w-auto md:h-20'}
        />
      </Link>
    );
  }

  const dot = 'bg-sunset-500';
  const text = variant === 'light' ? 'text-charcoal-900' : 'text-white';
  const sub = variant === 'light' ? 'text-charcoal-500' : 'text-charcoal-300';
  const badgeBg = variant === 'light' ? 'bg-charcoal-900' : 'bg-white';
  const badgeText = variant === 'light' ? 'text-white' : 'text-charcoal-900';
  const ring = variant === 'light' ? 'ring-white' : 'ring-charcoal-900';
  const textSize = size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg ${badgeBg} ${badgeText} shadow-sm`}
      >
        <span className="text-lg font-black leading-none">S</span>
        <span
          className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${dot} ring-2 ${ring}`}
        />
      </div>
      <div className={`flex flex-col leading-tight ${textSize}`}>
        <span className={`font-extrabold tracking-tight ${text}`}>
          {branding.siteName || 'Servis Platform'}
        </span>
        <span className={`text-[10px] font-medium uppercase tracking-widest ${sub}`}>
          {branding.siteTagline || 'Okul Servisi Marketi'}
        </span>
      </div>
    </Link>
  );
}
