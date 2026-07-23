'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { CallButton, WhatsAppButton } from '@/components/Contact';

interface OfferRow {
  id: string;
  monthlyPrice: string;
  status: string;
  createdAt: string;
  selectedAt: string | null;
  note: string | null;
  vehicle: {
    brand: string;
    model: string;
    year: number;
    plate: string;
  } | null;
  request: {
    id: string;
    status: string;
    city: string;
    district: string;
    neighborhood: string;
    address: string;
    pickupType: string;
    notes: string | null;
    parent: { name: string; phone: string };
    students: Array<{
      name: string;
      class: string | null;
      school: { name: string } | null;
    }>;
  };
}

const pickupLabel: Record<string, string> = {
  both: 'Gidiş + Dönüş',
  morning_only: 'Sadece Gidiş',
  afternoon_only: 'Sadece Dönüş',
};

export default function TekliflerimPage() {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'won' | 'pending' | 'lost'>('all');

  useEffect(() => {
    const token = providerSession.get();
    if (!token) return;
    apiGet<OfferRow[]>('/me/offers', token)
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, []);

  const stats = {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    won: rows.filter((r) => r.status === 'selected').length,
    lost: rows.filter((r) => r.status === 'rejected').length,
  };

  const filtered =
    tab === 'all'
      ? rows
      : tab === 'won'
        ? rows.filter((r) => r.status === 'selected')
        : tab === 'pending'
          ? rows.filter((r) => r.status === 'pending')
          : rows.filter((r) => r.status === 'rejected');

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Toplam" value={stats.total} color="charcoal" />
        <MiniStat label="Bekliyor" value={stats.pending} color="amber" />
        <MiniStat label="Kazandı" value={stats.won} color="emerald" />
        <MiniStat label="Kaybetti" value={stats.lost} color="charcoal" />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-charcoal-200">
        <TabBtn active={tab === 'all'} onClick={() => setTab('all')}>Tümü ({stats.total})</TabBtn>
        <TabBtn active={tab === 'won'} onClick={() => setTab('won')}>Kazandığım ({stats.won})</TabBtn>
        <TabBtn active={tab === 'pending'} onClick={() => setTab('pending')}>Bekleyen ({stats.pending})</TabBtn>
        <TabBtn active={tab === 'lost'} onClick={() => setTab('lost')}>Kaybettiğim ({stats.lost})</TabBtn>
      </div>

      <div className="grid gap-4">
        {filtered.map((o) => (
          <OfferCard key={o.id} offer={o} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-charcoal-200 bg-white p-16 text-center text-sm text-charcoal-500">
            Bu kategoride teklif yok.
          </div>
        )}
      </div>
    </div>
  );
}

function OfferCard({ offer }: { offer: OfferRow }) {
  const won = offer.status === 'selected';
  const lost = offer.status === 'rejected';
  return (
    <div
      className={
        'card p-6 ' +
        (won ? 'border-emerald-300 bg-emerald-50/40' : lost ? 'opacity-70' : '')
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold text-charcoal-900">
              {offer.request.neighborhood}
            </div>
            <span className="text-charcoal-300">·</span>
            <div className="text-sm text-charcoal-600">
              {offer.request.district}/{offer.request.city}
            </div>
          </div>
          <div className="mt-1 text-xs text-charcoal-500">
            {pickupLabel[offer.request.pickupType] ?? offer.request.pickupType}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-charcoal-900">
            {Number(offer.monthlyPrice).toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-xs text-charcoal-500">aylık teklif</div>
          <div className="mt-2">
            <StatusBadge status={offer.status} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
            Öğrenciler
          </div>
          <ul className="mt-1.5 space-y-1 text-sm text-charcoal-800">
            {offer.request.students.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span>👤</span>
                <span>
                  <strong>{s.name}</strong>
                  {s.class && <span className="text-charcoal-500"> · {s.class}</span>}
                  {s.school && (
                    <span className="text-charcoal-500"> — {s.school.name}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
            Adres
          </div>
          <div className="mt-1.5 text-sm text-charcoal-800">
            {offer.request.address}
          </div>
        </div>
      </div>

      {offer.note && (
        <div className="mt-4 rounded-lg bg-sand-50 p-3 text-sm text-charcoal-700">
          <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
            Notlarım
          </div>
          <div className="mt-1 whitespace-pre-line">{offer.note}</div>
        </div>
      )}

      {won && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-800">
            ✓ Teklifiniz seçildi — veli ile iletişime geçin
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-charcoal-900">
              {offer.request.parent.name}
            </span>
            <CallButton phone={offer.request.parent.phone} size="sm" />
            <WhatsAppButton
              phone={offer.request.parent.phone}
              size="sm"
              message={`Merhaba ${offer.request.parent.name}, Servis Platform üzerinden teklifimi seçtiniz. Servis planlaması için görüşebilir miyiz?`}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal-100 pt-3">
        <div className="text-xs text-charcoal-500">
          Teklif tarihi: {new Date(offer.createdAt).toLocaleDateString('tr-TR')}
          {offer.selectedAt && (
            <>
              {' · '}Seçim: {new Date(offer.selectedAt).toLocaleDateString('tr-TR')}
            </>
          )}
        </div>
        <Link
          href={`/servisci/talepler/${offer.request.id}`}
          className="text-xs font-semibold text-sunset-600 hover:text-sunset-700"
        >
          Talep Detayı →
        </Link>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'charcoal' | 'amber' | 'emerald';
}) {
  const cls =
    color === 'amber'
      ? 'text-amber-700'
      : color === 'emerald'
        ? 'text-emerald-700'
        : 'text-charcoal-900';
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-extrabold ${cls}`}>{value}</div>
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

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending: 'badge-warning',
    selected: 'badge-success',
    rejected: 'badge-neutral',
  };
  const label: Record<string, string> = {
    pending: 'Bekliyor',
    selected: 'Kazandı 🎉',
    rejected: 'Kaybetti',
  };
  return <span className={cls[status] ?? 'badge-neutral'}>{label[status] ?? status}</span>;
}
