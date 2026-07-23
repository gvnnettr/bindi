'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { parentSession } from '@/lib/session';
import { AppShell, Icons, NavItem } from '@/components/AppShell';
import { NotificationBell } from '@/components/NotificationBell';
import { PushEnable } from '@/components/PushEnable';

const publicPaths = ['/veli/giris'];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isPublic = publicPaths.includes(pathname);

  useEffect(() => {
    if (!isPublic && !parentSession.get()) {
      router.replace('/veli/giris');
    } else {
      setReady(true);
    }
  }, [pathname, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (!ready) return null;

  const nav: NavItem[] = [
    { href: '/veli', label: 'Taleplerim', icon: Icons.Inbox },
    { href: '/veli/ogrenciler', label: 'Öğrencilerim', icon: Icons.Users },
    { href: '/veli/aile', label: 'Aile Üyeleri', icon: Icons.Users },
    { href: '/veli/odemeler', label: 'Ödemeler', icon: Icons.Package },
    { href: '/veli/yeni-talep', label: 'Yeni Talep', icon: Icons.Offer },
    { href: '/veli/ayarlar', label: 'Ayarlar', icon: Icons.Settings },
  ];

  return (
    <AppShell
      brand="Servis Platform"
      subtitle="Veli Paneli"
      nav={nav}
      onSignOut={() => {
        parentSession.clear();
        router.push('/veli/giris');
      }}
      topRight={
        <>
          <PushEnable tokenGetter={parentSession.get} baseUrl="/parent" />
          <NotificationBell tokenGetter={parentSession.get} baseUrl="/me/parent" />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
