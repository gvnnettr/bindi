'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch, apiFetch } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button } from '@/components/ui';

interface Detail {
  parent: { id: string; phone: string; name: string; email: string | null; createdAt: string; hasPassword: boolean };
  students: Array<{ id: string; name: string; class: string | null; school: { id: string; name: string; city: string; district: string } | null }>;
  requests: Array<{
    id: string; status: string; city: string; district: string; neighborhood: string | null;
    address: string | null; createdAt: string;
    studentNames: string[]; offerCount: number;
    selectedOffer: { price: string; providerName: string } | null;
  }>;
  enrollments: Array<{
    id: string; status: string; monthlyPrice: string;
    student: { id: string; name: string };
    provider: { id: string; name: string };
  }>;
  payments: Array<{
    id: string; period: string; amount: number; status: string; dueDate: string;
    paidAt: string | null; receiptUrl: string | null;
  }>;
}

export default function AdminParentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const token = adminSession.get();
    if (!token || !id) return;
    try {
      const r = await apiGet<Detail>(`/admin/parents/${id}`, token);
      setData(r);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => { load(); }, [id]);

  async function resetPassword() {
    if (!confirm('Velinin PIN\'i sıfırlansın mı? Yeni PIN telefonuna SMS ile gidecek.')) return;
    setBusy(true);
    try {
      const token = adminSession.get();
      if (!token) return;
      const r = await apiPost<{ generatedPassword: string }>(`/admin/parents/${id}/reset-password`, {}, token);
      alert(`PIN sıfırlandı: ${r.generatedPassword} — SMS gönderildi.`);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteParent() {
    if (!confirm('Bu veli KALICI olarak silinsin mi? Tüm talepler, öğrenciler, ödemeler silinir. Geri alınamaz!')) return;
    setBusy(true);
    try {
      const token = adminSession.get();
      if (!token) return;
      await apiFetch(`/admin/parents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/admin/veliler');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshRequest(reqId: string) {
    if (!confirm('Bu talep yenilensin mi? Mevcut bekleyen teklifler iptal edilir, servisçilere tekrar SMS gider.')) return;
    setBusy(true);
    try {
      const token = adminSession.get();
      if (!token) return;
      const r = await apiPost<{ notifiedProviders: number }>(`/admin/requests/${reqId}/refresh`, {}, token);
      alert(`Talep yenilendi. ${r.notifiedProviders} servisçiye SMS + bildirim gönderildi.`);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="p-6 text-red-800">{error}</div>;
  if (!data) return <div className="p-6 text-charcoal-500">Yükleniyor...</div>;

  const { parent, students, requests, enrollments, payments } = data;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/veliler" className="text-sm text-charcoal-500 hover:underline">‹ Veli listesine dön</Link>
          <h1 className="text-2xl font-bold text-charcoal-900 mt-1">{parent.name}</h1>
          <div className="mt-1 text-sm text-charcoal-500 font-mono">{parent.phone}</div>
          {parent.email && <div className="text-xs text-charcoal-400">{parent.email}</div>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={resetPassword} disabled={busy}>
            🔑 PIN Sıfırla
          </Button>
          <Button variant="secondary" onClick={deleteParent} disabled={busy}>
            🗑️ Veli Sil
          </Button>
        </div>
      </div>

      {/* Öğrenciler */}
      <Card title={`Öğrenciler (${students.length})`}>
        {students.length === 0 ? (
          <div className="text-sm text-charcoal-400">Öğrenci yok</div>
        ) : (
          <div className="space-y-2">
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-charcoal-50 rounded-lg">
                <div>
                  <div className="font-bold text-charcoal-900">{s.name}</div>
                  <div className="text-xs text-charcoal-500">
                    {s.class ?? '—'} {s.school && `· ${s.school.name} (${s.school.district})`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Talepler */}
      <Card title={`Talepler (${requests.length})`}>
        {requests.length === 0 ? (
          <div className="text-sm text-charcoal-400">Talep yok</div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="p-3 bg-charcoal-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusPill status={r.status} />
                      <span className="text-xs text-charcoal-500">
                        {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="font-bold text-charcoal-900 mt-1">
                      {r.city} · {r.district}{r.neighborhood ? ` · ${r.neighborhood}` : ''}
                    </div>
                    <div className="text-xs text-charcoal-500 mt-1">
                      👦 {r.studentNames.join(', ')} · {r.offerCount} teklif
                      {r.selectedOffer && ` · ✅ ${r.selectedOffer.providerName} (${Number(r.selectedOffer.price).toLocaleString('tr-TR')}₺)`}
                    </div>
                  </div>
                  {r.status === 'open' && (
                    <Button variant="secondary" onClick={() => refreshRequest(r.id)} disabled={busy}>
                      🔄 Yenile
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Aktif kayıtlar */}
      {enrollments.length > 0 && (
        <Card title={`Aktif Kayıtlar (${enrollments.length})`}>
          <div className="space-y-2">
            {enrollments.map((e) => (
              <div key={e.id} className="p-3 bg-charcoal-50 rounded-lg text-sm">
                <div className="font-bold text-charcoal-900">
                  {e.student.name} → {e.provider.name}
                </div>
                <div className="text-xs text-charcoal-500 mt-1">
                  {Number(e.monthlyPrice).toLocaleString('tr-TR')}₺/ay · durum: {e.status}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ödemeler */}
      {payments.length > 0 && (
        <Card title={`Ödemeler (${payments.length})`}>
          <table className="w-full text-sm">
            <thead className="bg-charcoal-50 text-xs uppercase text-charcoal-500">
              <tr>
                <th className="px-3 py-2 text-left">Dönem</th>
                <th className="px-3 py-2 text-left">Tutar</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-left">Vade</th>
                <th className="px-3 py-2 text-left">Dekont</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-charcoal-100">
                  <td className="px-3 py-2 font-mono">{p.period}</td>
                  <td className="px-3 py-2 font-bold">{p.amount.toLocaleString('tr-TR')} ₺</td>
                  <td className="px-3 py-2"><StatusPill status={p.status} /></td>
                  <td className="px-3 py-2 text-xs">{new Date(p.dueDate).toLocaleDateString('tr-TR')}</td>
                  <td className="px-3 py-2">
                    {p.receiptUrl ? (
                      <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-sunset-600 underline text-xs">
                        📄 Görüntüle
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-charcoal-200 bg-white p-4">
      <h2 className="text-sm font-bold text-charcoal-900 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    open: { label: 'Açık', className: 'bg-blue-100 text-blue-800' },
    closed: { label: 'Kapalı', className: 'bg-charcoal-100 text-charcoal-600' },
    cancelled: { label: 'İptal', className: 'bg-red-100 text-red-800' },
    pending: { label: 'Bekliyor', className: 'bg-amber-100 text-amber-800' },
    submitted: { label: 'Dekont Gönderildi', className: 'bg-blue-100 text-blue-800' },
    paid: { label: 'Ödendi', className: 'bg-green-100 text-green-800' },
    active: { label: 'Aktif', className: 'bg-green-100 text-green-800' },
    ended: { label: 'Bitti', className: 'bg-charcoal-100 text-charcoal-600' },
  };
  const s = map[status] ?? { label: status, className: 'bg-charcoal-100 text-charcoal-600' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${s.className}`}>{s.label}</span>
  );
}
