'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushEnable({
  tokenGetter,
  baseUrl,
}: {
  tokenGetter: () => string | null;
  baseUrl: '/me' | '/parent' | '/admin';
}) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);
    apiGet<{ publicKey: string | null }>('/push/vapid-key')
      .then((r) => setPublicKey(r.publicKey))
      .catch(() => {});
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    if (!publicKey) {
      alert('Sunucu push yapılandırması eksik.');
      return;
    }
    const token = tokenGetter();
    if (!token) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }
      const json = sub.toJSON() as any;
      await apiPost(
        `${baseUrl}/push/subscribe`,
        {
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent.slice(0, 300),
        },
        token,
      );
      setSubscribed(true);
    } catch (e) {
      alert('Bildirim etkinleştirilemedi: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    const token = tokenGetter();
    if (!token) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiPost(
          `${baseUrl}/push/unsubscribe`,
          { endpoint: sub.endpoint },
          token,
        );
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;
  if (permission === 'denied') {
    return (
      <span className="text-xs text-charcoal-500">
        🔕 Bildirim izni tarayıcıdan engellendi
      </span>
    );
  }

  if (subscribed) {
    return (
      <button
        onClick={disable}
        disabled={busy}
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
      >
        🔔 Bildirimler Açık — Kapat
      </button>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={busy}
      className="rounded-lg border border-sunset-200 bg-sunset-50 px-3 py-1.5 text-xs font-semibold text-sunset-700 hover:bg-sunset-100"
    >
      {busy ? 'Bekleyin…' : '🔔 Bildirimleri Aç'}
    </button>
  );
}
