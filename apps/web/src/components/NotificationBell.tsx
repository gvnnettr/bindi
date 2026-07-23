'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, apiGet, apiPost } from '@/lib/api';

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * Bildirim çanı. Her panelde farklı endpoint kullanılır.
 * Auth token'ı props ile gelir (session'dan çekilir).
 */
export function NotificationBell({
  tokenGetter,
  baseUrl,
}: {
  tokenGetter: () => string | null;
  baseUrl: string; // '/me/parent' | '/me' | '/admin'
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const prevCountRef = useRef<number>(0);

  async function refreshCount() {
    const token = tokenGetter();
    if (!token) return;
    try {
      const r = await apiGet<{ count: number }>(
        `${baseUrl}/notifications/unread-count`,
        token,
      );
      if (
        r.count > prevCountRef.current &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const delta = r.count - prevCountRef.current;
        try {
          new Notification('Bindi — Yeni bildirim', {
            body:
              delta === 1
                ? '1 yeni bildiriminiz var.'
                : `${delta} yeni bildiriminiz var.`,
            icon: '/images/bindi-logo.jpg',
            tag: 'bindi-notif',
          });
        } catch {}
      }
      prevCountRef.current = r.count;
      setCount(r.count);
    } catch {}
  }

  async function loadList() {
    const token = tokenGetter();
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGet<NotificationRow[]>(`${baseUrl}/notifications`, token);
      setRows(data);
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      const askBtn = () => Notification.requestPermission();
      const t = setTimeout(askBtn, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function openDropdown() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    await loadList();
  }

  async function markRead(id: string) {
    const token = tokenGetter();
    if (!token) return;
    try {
      await apiPost(`${baseUrl}/notifications/${id}/read`, {}, token);
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, readAt: new Date().toISOString() } : r)),
      );
      setCount((c) => Math.max(0, c - 1));
    } catch {}
  }

  async function markAllRead() {
    const token = tokenGetter();
    if (!token) return;
    try {
      await apiPost(`${baseUrl}/notifications/read-all`, {}, token);
      setRows((prev) => prev.map((r) => ({ ...r, readAt: new Date().toISOString() })));
      setCount(0);
    } catch {}
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={openDropdown}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-charcoal-200 bg-white text-charcoal-700 transition hover:border-sunset-400 hover:text-sunset-600"
        aria-label="Bildirimler"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sunset-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-charcoal-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-charcoal-100 bg-sand-50 px-4 py-3">
            <div className="text-sm font-bold text-charcoal-900">Bildirimler</div>
            {rows.some((r) => !r.readAt) && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-sunset-600 hover:text-sunset-700"
              >
                Tümünü okundu yap
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-charcoal-500">Yükleniyor…</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-charcoal-500">Bildirim yok.</div>
            ) : (
              rows.map((r) => {
                const isRead = !!r.readAt;
                const content = (
                  <div className="flex items-start gap-3 border-b border-charcoal-100 p-4 hover:bg-sand-50">
                    <div
                      className={
                        'mt-1 h-2 w-2 flex-none rounded-full ' +
                        (isRead ? 'bg-charcoal-200' : 'bg-sunset-500')
                      }
                    />
                    <div className="flex-1">
                      <div className={'text-sm ' + (isRead ? 'text-charcoal-600' : 'font-semibold text-charcoal-900')}>
                        {r.title}
                      </div>
                      {r.body && (
                        <div className="mt-0.5 text-xs text-charcoal-500">{r.body}</div>
                      )}
                      <div className="mt-1 text-[10px] text-charcoal-400">
                        {new Date(r.createdAt).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </div>
                );
                if (r.link) {
                  return (
                    <Link
                      key={r.id}
                      href={r.link}
                      onClick={() => {
                        if (!isRead) markRead(r.id);
                        setOpen(false);
                      }}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }
                return (
                  <button
                    key={r.id}
                    onClick={() => !isRead && markRead(r.id)}
                    className="block w-full text-left"
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
