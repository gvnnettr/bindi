'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { parentSession } from '@/lib/session';
import { Button, Textarea } from '@/components/ui';
import { CallButton, WhatsAppButton } from '@/components/Contact';

interface ParentRequest {
  id: string;
  status: string;
  city: string;
  district: string;
  neighborhood: string;
  createdAt: string;
  magicToken: string;
  students: Array<{ name: string; school: string | null }>;
  offers: Array<{
    id: string;
    monthlyPrice: string;
    note: string | null;
    status: string;
    provider: {
      id: string;
      companyName: string;
      ownerName: string;
      phone: string | null;
      rating: { avg: number; count: number } | null;
    };
    vehicle: {
      brand: string;
      model: string;
      year: number;
      plate: string;
      seats: number;
    } | null;
  }>;
}

export default function ParentHome() {
  const [rows, setRows] = useState<ParentRequest[]>([]);
  const [me, setMe] = useState<{ name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'closed' | 'cancelled'>('active');

  async function load() {
    const token = parentSession.get();
    if (!token) return;
    try {
      const [data, m] = await Promise.all([
        apiGet<ParentRequest[]>('/me/parent/requests', token),
        apiGet<{ name: string }>('/me/parent', token),
      ]);
      setRows(data);
      setMe(m);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const counts = {
    active: rows.filter((r) => r.status === 'open' || r.status === 'matched').length,
    closed: rows.filter((r) => r.status === 'closed').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  };
  const filtered = rows.filter((r) =>
    tab === 'active'
      ? r.status === 'open' || r.status === 'matched'
      : tab === 'closed'
        ? r.status === 'closed'
        : r.status === 'cancelled',
  );

  async function select(magicToken: string, offerId: string) {
    if (!confirm('Bu servisçiyi seçmek istediğinize emin misiniz?')) return;
    try {
      await apiPost(`/requests/${magicToken}/offers/select`, { offerId });
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function cancelRequest(id: string) {
    if (!confirm('Talebi geri çekmek istediğinize emin misiniz?')) return;
    const token = parentSession.get();
    if (!token) return;
    try {
      await apiPost(`/me/parent/requests/${id}/cancel`, {}, token);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function unselectRequest(id: string) {
    if (!confirm('Seçiminizi geri almak istediğinize emin misiniz? Talep tekrar açılır.')) return;
    const token = parentSession.get();
    if (!token) return;
    try {
      await apiPost(`/me/parent/requests/${id}/unselect`, {}, token);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );

  return (
    <div className="space-y-6">
      {me && (
        <div className="card p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
            Hoş geldiniz
          </div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-charcoal-900">
            {me.name} 👋
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex gap-2 border-b border-charcoal-200">
          <TabBtn active={tab === 'active'} onClick={() => setTab('active')}>
            Aktif ({counts.active})
          </TabBtn>
          <TabBtn active={tab === 'closed'} onClick={() => setTab('closed')}>
            Kapanmış ({counts.closed})
          </TabBtn>
          <TabBtn active={tab === 'cancelled'} onClick={() => setTab('cancelled')}>
            İptal Edilmiş ({counts.cancelled})
          </TabBtn>
        </div>
        <Link href="/veli/yeni-talep" className="btn-primary">
          Yeni Talep
        </Link>
      </div>

      <div className="space-y-6">
        {filtered.map((r) => (
          <div key={r.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-charcoal-900">
                  {r.neighborhood}, {r.district}/{r.city}
                </div>
                <div className="mt-1 text-sm text-charcoal-600">
                  {r.students.map((s) => `${s.name}${s.school ? ' — ' + s.school : ''}`).join(', ')}
                </div>
                <div className="mt-1 text-xs text-charcoal-500">
                  {new Date(r.createdAt).toLocaleString('tr-TR')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={r.status} />
                {r.status === 'open' && (
                  <button
                    onClick={() => cancelRequest(r.id)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Talebi Geri Çek
                  </button>
                )}
                {r.status === 'closed' && (
                  <button
                    onClick={() => unselectRequest(r.id)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Seçimi Geri Al
                  </button>
                )}
              </div>
            </div>

            {r.offers.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-charcoal-200 bg-sand-50 p-6 text-center text-sm text-charcoal-500">
                Henüz teklif yok. Servisçiler teklif verdikçe burada göreceksiniz.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {r.offers.map((o) => (
                  <OfferCard
                    key={o.id}
                    offer={o}
                    onSelect={() => select(r.magicToken, o.id)}
                    onReview={() => setReviewFor(o.id)}
                    reviewOpen={reviewFor === o.id}
                    onReviewClose={() => setReviewFor(null)}
                    onReviewed={() => {
                      setReviewFor(null);
                      load();
                    }}
                    canSelect={r.status !== 'closed'}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-charcoal-200 bg-white p-16 text-center text-sm text-charcoal-500">
            Bu kategoride talep yok.
          </div>
        )}
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  onSelect,
  onReview,
  reviewOpen,
  onReviewClose,
  onReviewed,
  canSelect,
}: {
  offer: ParentRequest['offers'][number];
  onSelect: () => void;
  onReview: () => void;
  reviewOpen: boolean;
  onReviewClose: () => void;
  onReviewed: () => void;
  canSelect: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitReview() {
    const token = parentSession.get();
    if (!token) return;
    setSaving(true);
    try {
      await apiFetch('/me/parent/offers/' + offer.id + '/review', {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment || undefined }),
        headers: { Authorization: `Bearer ${token}` },
      });
      onReviewed();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const selected = offer.status === 'selected';
  const rejected = offer.status === 'rejected';

  return (
    <div
      className={
        'rounded-xl border p-4 md:p-6 ' +
        (selected
          ? 'border-emerald-300 bg-emerald-50'
          : rejected
            ? 'border-charcoal-100 bg-white opacity-60'
            : 'border-charcoal-100 bg-white')
      }
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-charcoal-900 md:text-lg">
            {offer.provider.companyName}
          </div>
          <div className="text-sm text-charcoal-500">{offer.provider.ownerName}</div>
          <div className="mt-2">
            <BigRating value={offer.provider.rating?.avg} count={offer.provider.rating?.count} />
          </div>
          {!selected && (
            <div className="mt-3 rounded-md bg-sand-50 px-3 py-1.5 text-[11px] text-charcoal-600">
              🔒 Firma ve iletişim bilgileri onayınız sonrası açılır.
            </div>
          )}
        </div>
        <div className="flex-none text-left md:text-right">
          <div className="flex items-baseline gap-1 md:justify-end">
            <span className="text-2xl font-extrabold text-sunset-600 md:text-3xl">
              {Number(offer.monthlyPrice).toLocaleString('tr-TR')}
            </span>
            <span className="text-lg font-bold text-sunset-600">₺</span>
            <span className="text-xs text-charcoal-500">/ aylık</span>
          </div>
        </div>
      </div>

      {offer.vehicle && (
        <div className="mt-3 text-xs text-charcoal-600">
          🚐 {offer.vehicle.brand} {offer.vehicle.model} ({offer.vehicle.year}) — {offer.vehicle.seats} kişilik
        </div>
      )}
      {offer.note && (
        <p className="mt-2 whitespace-pre-line text-sm text-charcoal-700">{offer.note}</p>
      )}

      {selected && offer.provider.phone && (
        <div className="mt-3 rounded-lg bg-emerald-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            İletişim
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CallButton phone={offer.provider.phone} size="sm" />
            <WhatsAppButton
              phone={offer.provider.phone}
              size="sm"
              message="Merhaba, Servis Platform üzerinden teklifinizi seçtim. Detayları görüşebilir miyiz?"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {canSelect && !selected && !rejected && (
          <Button size="sm" onClick={onSelect} className="flex-1">
            Bu Servisçiyi Seç
          </Button>
        )}
        {selected && (
          <Button size="sm" variant="secondary" onClick={onReview} className="flex-1">
            Puanla
          </Button>
        )}
      </div>

      {reviewOpen && (
        <div className="mt-4 rounded-lg border border-charcoal-100 bg-sand-50 p-4">
          <div className="text-sm font-semibold text-charcoal-800">Puanınız</div>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={n <= rating ? 'text-sunset-500' : 'text-charcoal-300'}
              >
                <svg width="28" height="28" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.156c.969 0 1.371 1.24.588 1.81l-3.362 2.445a1 1 0 00-.363 1.118l1.286 3.955c.3.921-.755 1.688-1.539 1.118l-3.362-2.445a1 1 0 00-1.175 0l-3.362 2.445c-.784.57-1.838-.197-1.539-1.118l1.286-3.955a1 1 0 00-.363-1.118L2.98 9.382c-.784-.57-.38-1.81.588-1.81h4.156a1 1 0 00.95-.69l1.286-3.955z" />
                </svg>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Textarea
              rows={2}
              placeholder="Yorumunuz (opsiyonel)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={onReviewClose}>
              Vazgeç
            </Button>
            <Button size="sm" disabled={saving} onClick={submitReview}>
              Gönder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Rating({ value, count }: { value: number | undefined; count?: number }) {
  if (!value || !count)
    return <span className="text-xs text-charcoal-400">Henüz puan yok</span>;
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-sunset-500">★</span>
      <span className="font-semibold text-charcoal-900">{value.toFixed(1)}</span>
      <span className="text-charcoal-500">({count})</span>
    </div>
  );
}

function BigRating({ value, count }: { value: number | undefined; count?: number }) {
  if (!value || !count)
    return <span className="text-sm text-charcoal-400">Henüz puan yok</span>;
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={n <= Math.round(value) ? 'text-sunset-500' : 'text-charcoal-200'}
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.156c.969 0 1.371 1.24.588 1.81l-3.362 2.445a1 1 0 00-.363 1.118l1.286 3.955c.3.921-.755 1.688-1.539 1.118l-3.362-2.445a1 1 0 00-1.175 0l-3.362 2.445c-.784.57-1.838-.197-1.539-1.118l1.286-3.955a1 1 0 00-.363-1.118L2.98 9.382c-.784-.57-.38-1.81.588-1.81h4.156a1 1 0 00.95-.69l1.286-3.955z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-bold text-charcoal-900">{value.toFixed(1)}</span>
      <span className="text-xs text-charcoal-500">({count})</span>
    </div>
  );
}

function TabBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative -mb-px px-4 py-2.5 text-sm font-semibold transition ' +
        (active
          ? 'border-b-2 border-sunset-500 text-charcoal-900'
          : 'border-b-2 border-transparent text-charcoal-500 hover:text-charcoal-900')
      }
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    open: { cls: 'badge-warning', label: 'Teklif Bekliyor' },
    matched: { cls: 'badge-info', label: 'Eşleşti' },
    closed: { cls: 'badge-success', label: 'Servisçi Seçildi' },
    cancelled: { cls: 'badge-neutral', label: 'İptal Edildi' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={m.cls}>{m.label}</span>;
}
