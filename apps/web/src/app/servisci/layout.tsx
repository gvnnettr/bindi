'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { providerSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import { AppShell, Icons, NavItem } from '@/components/AppShell';
import { NotificationBell } from '@/components/NotificationBell';
import { PushEnable } from '@/components/PushEnable';

const publicPaths = ['/servisci/kayit', '/servisci/giris', '/servisci/sifre-sifirla'];
// mustChangePassword aktif iken sadece bu yollara izin verilir
const passwordChangeAllowedPaths = ['/servisci/sifre-degistir'];

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isPublic = publicPaths.includes(pathname);

  useEffect(() => {
    if (isPublic) {
      setReady(true);
      return;
    }
    const token = providerSession.get();
    if (!token) {
      router.replace('/servisci/giris');
      return;
    }
    apiGet<{ mustChangePassword?: boolean }>('/me', token)
      .then((me) => {
        if (me?.mustChangePassword && !passwordChangeAllowedPaths.includes(pathname)) {
          router.replace('/servisci/sifre-degistir');
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        setReady(true);
      });
  }, [pathname, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (!ready) return null;

  const nav: NavItem[] = [
    { href: '/servisci', label: 'Panel', icon: Icons.Dashboard },
    { href: '/servisci/talepler', label: 'Talepler', icon: Icons.Inbox },
    { href: '/servisci/tekliflerim', label: 'Tekliflerim', icon: Icons.Offer },
    { href: '/servisci/ogrencilerim', label: 'Öğrencilerim', icon: Icons.School },
    { href: '/servisci/odemeler', label: 'Ödemeler', icon: Icons.Package },
    { href: '/servisci/rapor', label: 'Rapor', icon: Icons.Dashboard },
    { href: '/servisci/araclar', label: 'Araçlar', icon: Icons.Truck },
    { href: '/servisci/soforler', label: 'Şoförler', icon: Icons.Users },
    { href: '/servisci/belgelerim', label: 'Belgelerim', icon: Icons.Settings },
    { href: '/servisci/ayarlar', label: 'Ayarlar', icon: Icons.Settings },
  ];

  return (
    <AppShell
      brand="Servis Platform"
      subtitle="Servisçi Paneli"
      nav={nav}
      onSignOut={() => {
        providerSession.clear();
        router.push('/servisci/giris');
      }}
      topRight={
        <>
          <PushEnable tokenGetter={providerSession.get} baseUrl="/me" />
          <NotificationBell tokenGetter={providerSession.get} baseUrl="/me" />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
