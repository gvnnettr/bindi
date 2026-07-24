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
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddRequest, setShowAddRequest] = useState(false);

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
      <Card
        title={`Öğrenciler (${students.length})`}
        action={
          <button
            onClick={() => setShowAddStudent(true)}
            className="text-sm font-bold text-sunset-600 hover:underline"
          >
            + Öğrenci Ekle
          </button>
        }
      >
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
      <Card
        title={`Talepler (${requests.length})`}
        action={
          students.length > 0 ? (
            <button
              onClick={() => setShowAddRequest(true)}
              className="text-sm font-bold text-sunset-600 hover:underline"
            >
              + Admin Adına Talep Aç
            </button>
          ) : null
        }
      >
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

      {showAddStudent && (
        <AddStudentModal
          parentId={id}
          onClose={() => setShowAddStudent(false)}
          onDone={() => { setShowAddStudent(false); load(); }}
        />
      )}

      {showAddRequest && (
        <AddRequestModal
          parentId={id}
          students={students}
          onClose={() => setShowAddRequest(false)}
          onDone={() => { setShowAddRequest(false); load(); }}
        />
      )}
    </div>
  );
}

function AddStudentModal({ parentId, onClose, onDone }: { parentId: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState<Array<{ id: string; name: string; city: string; district: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = adminSession.get();
    if (!token) return;
    apiGet<any[]>('/admin/schools', token)
      .then(setSchools)
      .catch(() => {});
  }, []);

  async function submit() {
    if (!name.trim() || !schoolId) { setError('Ad ve okul zorunlu'); return; }
    setLoading(true); setError(null);
    try {
      const token = adminSession.get();
      if (!token) throw new Error('Oturum yok');
      await apiPost(`/admin/parents/${parentId}/students`, {
        name: name.trim(),
        class: studentClass.trim() || undefined,
        schoolId,
      }, token);
      onDone();
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 space-y-3">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-charcoal-900">Yeni Öğrenci Ekle</h2>
          <button onClick={onClose} className="text-charcoal-400 text-xl">✕</button>
        </div>
        {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>}
        <div>
          <label className="text-xs font-bold text-charcoal-500 uppercase">Ad Soyad *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-charcoal-200 px-3 py-2 mt-1" placeholder="Örn: Elif Güven" />
        </div>
        <div>
          <label className="text-xs font-bold text-charcoal-500 uppercase">Sınıf</label>
          <input value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="w-full rounded-lg border border-charcoal-200 px-3 py-2 mt-1" placeholder="Örn: 3. Sınıf" />
        </div>
        <div>
          <label className="text-xs font-bold text-charcoal-500 uppercase">Okul *</label>
          <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="w-full rounded-lg border border-charcoal-200 px-3 py-2 mt-1 bg-white">
            <option value="">— Okul seç —</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.district}, {s.city})</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Vazgeç</Button>
          <Button onClick={submit} disabled={loading} className="flex-1">{loading ? 'Ekleniyor...' : 'Ekle'}</Button>
        </div>
      </div>
    </div>
  );
}

function AddRequestModal({
  parentId,
  students,
  onClose,
  onDone,
}: {
  parentId: string;
  students: Array<{ id: string; name: string; school: { name: string; city: string; district: string } | null }>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [pickupType, setPickupType] = useState<'both' | 'morning_only' | 'afternoon_only'>('both');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // İlk seçilen öğrencinin okulundan şehir/ilçe önerisi
  useEffect(() => {
    if (selectedIds.length > 0 && !city) {
      const s = students.find((x) => x.id === selectedIds[0]);
      if (s?.school) {
        setCity(s.school.city);
        setDistrict(s.school.district);
      }
    }
  }, [selectedIds, students, city]);

  async function submit() {
    if (selectedIds.length === 0) { setError('En az bir öğrenci seç'); return; }
    if (!city.trim() || !district.trim() || !neighborhood.trim() || address.trim().length < 5) {
      setError('Şehir, ilçe, mahalle ve adres zorunlu (adres en az 5 karakter)');
      return;
    }
    setLoading(true); setError(null);
    try {
      const token = adminSession.get();
      if (!token) throw new Error('Oturum yok');
      await apiPost(`/admin/parents/${parentId}/requests`, {
        studentIds: selectedIds,
        city: city.trim(),
        district: district.trim(),
        neighborhood: neighborhood.trim(),
        address: address.trim(),
        pickupType,
        notes: notes.trim() || undefined,
      }, token);
      onDone();
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-charcoal-900">Admin Adına Talep Aç</h2>
            <p className="text-xs text-charcoal-500 mt-1">Veli için talep oluştur, servisçilere SMS + push gider</p>
          </div>
          <button onClick={onClose} className="text-charcoal-400 text-xl">✕</button>
        </div>
        {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>}

        <div>
          <label className="text-xs font-bold text-charcoal-500 uppercase">Öğrenciler *</label>
          <div className="space-y-1 mt-1">
            {students.map((s) => (
              <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-charcoal-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => setSelectedIds((prev) => prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id])}
                />
                <div>
                  <div className="text-sm font-bold text-charcoal-900">{s.name}</div>
                  {s.school && <div className="text-xs text-charcoal-500">{s.school.name}</div>}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-charcoal-500 uppercase">Şehir *</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-charcoal-200 px-3 py-2 mt-1" placeholder="Ordu" />
          </div>
          <div>
            <label className="text-xs font-bold text-charcoal-500 uppercase">İlçe *</label>
            <input value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full rounded-lg border border-charcoal-200 px-3 py-2 mt-1" placeholder="Altınordu" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-charcoal-500 uppercase">Mahalle *</label>
          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full rounded-lg border border-charcoal-200 px-3 py-2 mt-1" placeholder="Şarkiye Mah." />
        </div>
        <div>
          <label className="text-xs font-bold text-charcoal-500 uppercase">Adres *</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-charcoal-200 px-3 py-2 mt-1" placeholder="Sahil Cad. No: 42" />
        </div>
        <div>
          <label className="text-xs font-bold text-charcoal-500 uppercase">Servis Tercihi</label>
          <select value={pickupType} onChange={(e) => setPickupType(e.target.value as any)} className="w-full rounded-lg border border-charcoal-200 px-3 py-2 mt-1 bg-white">
            <option value="both">Gidiş + Dönüş</option>
            <option value="morning_only">Sadece Sabah</option>
            <option value="afternoon_only">Sadece Öğleden Sonra</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-charcoal-500 uppercase">Not (opsiyonel)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-charcoal-200 px-3 py-2 mt-1" rows={2} placeholder="Örn: 3 gün deneme yapılabilir" />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Vazgeç</Button>
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? 'Oluşturuluyor...' : 'Talep Oluştur & Bildir'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-charcoal-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-charcoal-900 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
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
