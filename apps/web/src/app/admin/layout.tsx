'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { adminSession } from '@/lib/session';
import { AppShell, Icons, NavItem } from '@/components/AppShell';
import { NotificationBell } from '@/components/NotificationBell';
import { PushEnable } from '@/components/PushEnable';

const publicPaths = ['/admin/giris'];
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 dakika hareketsizlik

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isPublic = publicPaths.includes(pathname);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPublic && !adminSession.get()) {
      router.replace('/admin/giris');
    } else {
      setReady(true);
    }
  }, [pathname, isPublic, router]);

  // API 401/403 dinle -> oturum bittiginde login'e at
  useEffect(() => {
    if (isPublic) return;
    function onUnauthorized() {
      adminSession.clear();
      router.replace('/admin/giris?expired=1');
    }
    window.addEventListener('api:unauthorized', onUnauthorized);
    return () => window.removeEventListener('api:unauthorized', onUnauthorized);
  }, [isPublic, router]);

  // Idle timeout: 30 dk hareketsizlik sonrasi otomatik cikis
  useEffect(() => {
    if (isPublic || !ready) return;
    function reset() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        adminSession.clear();
        router.replace('/admin/giris?expired=1');
      }, IDLE_TIMEOUT_MS);
    }
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    for (const ev of events) window.addEventListener(ev, reset);
    reset();
    return () => {
      for (const ev of events) window.removeEventListener(ev, reset);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isPublic, ready, router]);

  if (isPublic) return <>{children}</>;
  if (!ready) return null;

  const nav: NavItem[] = [
    { href: '/admin', label: 'Panel', icon: Icons.Dashboard },
    { href: '/admin/servisciler', label: 'Servisçiler', icon: Icons.Users },
    { href: '/admin/veliler', label: 'Veliler', icon: Icons.Users },
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
