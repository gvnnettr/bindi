'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminSession } from '@/lib/session';
import { AppShell, Icons, NavItem } from '@/components/AppShell';
import { NotificationBell } from '@/components/NotificationBell';
import { PushEnable } from '@/components/PushEnable';

const publicPaths = ['/admin/giris'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isPublic = publicPaths.includes(pathname);

  useEffect(() => {
    if (!isPublic && !adminSession.get()) {
      router.replace('/admin/giris');
    } else {
      setReady(true);
    }
  }, [pathname, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (!ready) return null;

  const nav: NavItem[] = [
    { href: '/admin', label: 'Panel', icon: Icons.Dashboard },
    { href: '/admin/servisciler', label: 'Servisçiler', icon: Icons.Users },
    { href: '/admin/talepler', label: 'Talepler', icon: Icons.Inbox },
    { href: '/admin/okullar', label: 'Okullar', icon: Icons.School },
    { href: '/admin/sehirler', label: 'Şehirler', icon: Icons.School },
    { href: '/admin/paketler', label: 'Paketler', icon: Icons.Package },
    { href: '/admin/belge-tanimlari', label: 'Belge Tanımları', icon: Icons.Settings },
    { href: '/admin/bildirim', label: 'Bildirim Gönder', icon: Icons.Inbox },
    { href: '/admin/kullanicilar', label: 'Kullanıcılar', icon: Icons.Users },
    { href: '/admin/log', label: 'Aktivite Kaydı', icon: Icons.Inbox },
    { href: '/admin/ayarlar', label: 'Ayarlar', icon: Icons.Settings },
  ];

  return (
    <AppShell
      brand="Servis Platform"
      subtitle="Admin Paneli"
      nav={nav}
      onSignOut={() => {
        adminSession.clear();
        router.push('/admin/giris');
      }}
      topRight={
        <>
          <PushEnable tokenGetter={adminSession.get} baseUrl="/admin" />
          <NotificationBell tokenGetter={adminSession.get} baseUrl="/admin" />
          <div className="flex items-center gap-2 rounded-full border border-charcoal-200 bg-white px-3 py-1.5 text-xs text-charcoal-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sistem çevrimiçi
          </div>
        </>
      }
    >
      {children}
    </AppShell>
  );
}
