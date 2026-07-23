'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { providerSession } from '@/lib/session';

interface RequestSummary {
  id: string;
  city: string;
  district: string;
  neighborhood: string;
  createdAt: string;
  students: Array<{ name: string; school: { name: string } | null }>;
  myOffer: { id: string; monthlyPrice: string; status: string } | null;
}

export default function TaleplerPage() {
  const [rows, setRows] = useState<RequestSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'offered'>('all');

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const data = await apiGet<RequestSummary[]>('/me/requests', token);
      setRows(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function decline(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Bu talebi reddetmek istediğinize emin misiniz? Listenizden kaldırılacak.'))
      return;
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiPost(`/me/requests/${id}/decline`, {}, token);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );

  const filtered = rows.filter((r) =>
    filter === 'all'
      ? true
      : filter === 'new'
        ? !r.myOffer
        : !!r.myOffer,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
            Toplam
          </div>
          <div className="text-2xl font-extrabold text-charcoal-900">
            {rows.length} açık talep
          </div>
        </div>
        <div className="flex gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            Tümü ({rows.length})
          </FilterChip>
          <FilterChip active={filter === 'new'} onClick={() => setFilter('new')}>
            Yeni ({rows.filter((r) => !r.myOffer).length})
          </FilterChip>
          <FilterChip active={filter === 'offered'} onClick={() => setFilter('offered')}>
            Teklif Verdim ({rows.filter((r) => r.myOffer).length})
          </FilterChip>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/servisci/talepler/${r.id}`}
            className="card group flex items-center gap-6 p-6 transition hover:shadow-card-hover"
          >
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-sunset-100 text-2xl">
              🎒
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-charcoal-900">
                  {r.neighborhood}
                </div>
                <span className="text-charcoal-300">·</span>
                <div className="text-sm text-charcoal-600">
                  {r.district}/{r.city}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-charcoal-600">
                {r.students.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <span>👤</span>
                    <span className="font-medium">{s.name}</span>
                    {s.school && <span className="text-charcoal-400">— {s.school.name}</span>}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-charcoal-400">
                {new Date(r.createdAt).toLocaleString('tr-TR')}
              </div>
            </div>
            <div className="text-right">
              {r.myOffer ? (
                <>
                  <div className="text-lg font-extrabold text-charcoal-900">
                    {Number(r.myOffer.monthlyPrice).toLocaleString('tr-TR')} ₺
                  </div>
                  <div className="text-xs text-charcoal-500">Teklifiniz</div>
                  <div className="mt-1.5">
                    <StatusBadge status={r.myOffer.status} />
                  </div>
                </>
              ) : (
                <>
                  <span className="badge-accent">Teklif Ver</span>
                  <button
                    onClick={(e) => decline(e, r.id)}
                    className="mt-2 block text-xs font-semibold text-red-500 hover:text-red-700"
                    title="Bu talebi listemden kaldır"
                  >
                    Reddet
                  </button>
                </>
              )}
            </div>
            <svg
              className="h-5 w-5 flex-none text-charcoal-300 transition group-hover:text-sunset-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-charcoal-200 bg-white p-16 text-center text-sm text-charcoal-500">
            Bu kategoride talep bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
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
        'rounded-full px-4 py-1.5 text-sm font-medium transition ' +
        (active
          ? 'bg-charcoal-900 text-white'
          : 'bg-white border border-charcoal-200 text-charcoal-700 hover:border-charcoal-300')
      }
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge-warning',
    selected: 'badge-success',
    rejected: 'badge-neutral',
  };
  const label: Record<string, string> = {
    pending: 'Bekliyor',
    selected: 'Seçildi 🎉',
    rejected: 'Seçilmedi',
  };
  return <span className={map[status] ?? 'badge-neutral'}>{label[status] ?? status}</span>;
}
