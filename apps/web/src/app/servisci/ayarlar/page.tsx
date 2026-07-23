'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { Combobox } from '@/components/Combobox';
import { LocationButton, LocationChip } from '@/components/LocationButton';
import { TURKEY_CITIES, getDistricts } from '@servis/shared';

type Tab = 'firma' | 'okullar' | 'bolgeler' | 'sifre';

interface Me {
  companyName: string;
  taxNo: string | null;
  ownerName: string;
  email: string | null;
  address: string | null;
}
interface SchoolItem {
  id: string;
  school: { id: string; name: string; city: string; district: string };
}
interface RegionItem {
  id: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  label: string | null;
}
interface School {
  id: string;
  name: string;
  city: string;
  district: string;
}

export default function ProviderProfilePage() {
  const [tab, setTab] = useState<Tab>('firma');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function say(msg: string) {
    setNotice(msg);
    setError(null);
    setTimeout(() => setNotice(null), 2500);
  }
  function fail(msg: string) {
    setError(msg);
    setNotice(null);
  }

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-b border-charcoal-200">
        <TabBtn active={tab === 'firma'} onClick={() => setTab('firma')}>Firma Bilgileri</TabBtn>
        <TabBtn active={tab === 'okullar'} onClick={() => setTab('okullar')}>Okullar</TabBtn>
        <TabBtn active={tab === 'bolgeler'} onClick={() => setTab('bolgeler')}>Bölgeler</TabBtn>
        <TabBtn active={tab === 'sifre'} onClick={() => setTab('sifre')}>Şifre</TabBtn>
      </div>

      {tab === 'firma' && <FirmaTab onOk={say} onErr={fail} />}
      {tab === 'okullar' && <OkullarTab onOk={say} onErr={fail} />}
      {tab === 'bolgeler' && <BolgelerTab onOk={say} onErr={fail} />}
      {tab === 'sifre' && <SifreTab onOk={say} onErr={fail} />}
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

function FirmaTab({ onOk, onErr }: { onOk: (s: string) => void; onErr: (s: string) => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = providerSession.get();
    if (!token) return;
    apiGet<Me>('/me', token).then(setMe).catch((e) => onErr((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const token = providerSession.get();
    if (!token || !me) return;
    setLoading(true);
    try {
      await apiFetch('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          companyName: me.companyName,
          taxNo: me.taxNo ?? '',
          ownerName: me.ownerName,
          email: me.email ?? '',
          address: me.address ?? '',
        }),
        headers: { Authorization: `Bearer ${token}` },
      });
      onOk('Firma bilgileri güncellendi.');
    } catch (e) {
      onErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!me) return <div className="text-charcoal-500">Yükleniyor…</div>;
  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-lg font-bold text-charcoal-900">Firma Bilgileri</h2>
      <Field label="Firma Ünvanı">
        <Input value={me.companyName} onChange={(e) => setMe({ ...me, companyName: e.target.value })} />
      </Field>
      <Field label="Vergi No">
        <Input value={me.taxNo ?? ''} onChange={(e) => setMe({ ...me, taxNo: e.target.value })} />
      </Field>
      <Field label="Yetkili Ad Soyad">
        <Input value={me.ownerName} onChange={(e) => setMe({ ...me, ownerName: e.target.value })} />
      </Field>
      <Field label="E-posta">
        <Input type="email" value={me.email ?? ''} onChange={(e) => setMe({ ...me, email: e.target.value })} />
      </Field>
      <Field label="Adres">
        <Textarea rows={2} value={me.address ?? ''} onChange={(e) => setMe({ ...me, address: e.target.value })} />
      </Field>
      <Button disabled={loading} onClick={save}>Kaydet</Button>
    </div>
  );
}

function OkullarTab({ onOk, onErr }: { onOk: (s: string) => void; onErr: (s: string) => void }) {
  const [rows, setRows] = useState<SchoolItem[]>([]);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState('');

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const [my, all] = await Promise.all([
        apiGet<SchoolItem[]>('/me/schools', token),
        apiGet<School[]>('/schools/public'),
      ]);
      setRows(my);
      setAllSchools(all);
    } catch (e) {
      onErr((e as Error).message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    const token = providerSession.get();
    if (!token || !schoolId) return;
    try {
      await apiPost('/me/schools', { schoolId }, token);
      setSchoolId('');
      await load();
      onOk('Okul eklendi.');
    } catch (e) {
      onErr((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm('Bu okulu listenizden çıkarmak istiyor musunuz?')) return;
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiFetch(`/me/schools/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
      onOk('Okul kaldırıldı.');
    } catch (e) {
      onErr((e as Error).message);
    }
  }

  const myIds = new Set(rows.map((r) => r.school.id));
  const available = allSchools.filter((s) => !myIds.has(s.id));

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-charcoal-900">Hizmet Verdiğim Okullar</h2>
        <p className="mt-1 text-xs text-charcoal-500">
          Bu okullardaki öğrencilerin talepleri size düşer.
        </p>
        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-charcoal-100 bg-sand-50/50 p-3"
            >
              <div>
                <div className="font-medium text-charcoal-900">{r.school.name}</div>
                <div className="text-xs text-charcoal-500">
                  {r.school.city} / {r.school.district}
                </div>
              </div>
              <button
                onClick={() => remove(r.id)}
                className="text-xs font-semibold text-red-500 hover:text-red-700"
              >
                Kaldır
              </button>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-lg border border-dashed border-charcoal-200 p-6 text-center text-sm text-charcoal-500">
              Henüz okul eklemediniz.
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-charcoal-900">Okul Ekle</h3>
        <div className="mt-3 flex gap-2">
          <Select
            className="flex-1"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
          >
            <option value="">— Okul seçin —</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.city}/{s.district}
              </option>
            ))}
          </Select>
          <Button disabled={!schoolId} onClick={add}>Ekle</Button>
        </div>
      </div>
    </div>
  );
}

function BolgelerTab({ onOk, onErr }: { onOk: (s: string) => void; onErr: (s: string) => void }) {
  const [rows, setRows] = useState<RegionItem[]>([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [locLabel, setLocLabel] = useState('');
  const [locLatLng, setLocLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [locRadius, setLocRadius] = useState(10);

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const data = await apiGet<RegionItem[]>('/me/regions', token);
      setRows(data);
    } catch (e) {
      onErr((e as Error).message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    const token = providerSession.get();
    if (!token || !city || !district) return;
    try {
      await apiPost('/me/regions', { city, district }, token);
      setCity('');
      setDistrict('');
      await load();
      onOk('Bölge eklendi.');
    } catch (e) {
      onErr((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm('Bu bölgeyi kaldırmak istiyor musunuz?')) return;
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiFetch(`/me/regions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
      onOk('Bölge kaldırıldı.');
    } catch (e) {
      onErr((e as Error).message);
    }
  }

  async function addLocationRegion() {
    const token = providerSession.get();
    if (!token || !locLatLng || !locLabel) return;
    try {
      await apiPost(
        '/me/regions/location',
        {
          label: locLabel,
          latitude: locLatLng.lat,
          longitude: locLatLng.lng,
          radiusKm: locRadius,
        },
        token,
      );
      setLocLabel('');
      setLocLatLng(null);
      setLocRadius(10);
      await load();
      onOk('Lokasyon bazlı bölge eklendi.');
    } catch (e) {
      onErr((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-charcoal-900">Hizmet Verdiğim Bölgeler</h2>
        <p className="mt-1 text-xs text-charcoal-500">
          Talepler bu bölgelerden gelenlerle eşleşir.
        </p>
        <div className="mt-4 space-y-2">
          {rows.map((r) => {
            const isLoc = !!(r.latitude && r.longitude && r.radiusKm);
            return (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-charcoal-100 bg-sand-50/50 p-3"
              >
                <div className="flex items-center gap-3 text-sm text-charcoal-900">
                  {isLoc ? (
                    <>
                      <span className="rounded-md bg-deepsea-100 px-2 py-0.5 text-xs text-deepsea-700">
                        📍 Lokasyon
                      </span>
                      <span>
                        <strong>{r.label ?? 'İsimsiz'}</strong>{' '}
                        <span className="text-charcoal-500">
                          — {r.radiusKm} km yarıçap
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="rounded-md bg-sand-200 px-2 py-0.5 text-xs text-charcoal-700">
                        🏛 İl/İlçe
                      </span>
                      <span>{r.city} / {r.district}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => remove(r.id)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                >
                  Kaldır
                </button>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="rounded-lg border border-dashed border-charcoal-200 p-6 text-center text-sm text-charcoal-500">
              Henüz bölge eklemediniz.
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-charcoal-900">İl / İlçe Ekle</h3>
        <p className="mt-1 text-xs text-charcoal-500">
          Tüm il/ilçedeki talepler size düşer.
        </p>
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
          <Combobox
            value={city}
            onChange={(v) => {
              setCity(v);
              if (getDistricts(v).length && !getDistricts(v).includes(district)) {
                setDistrict('');
              }
            }}
            options={TURKEY_CITIES as unknown as string[]}
            placeholder="İl"
          />
          <Combobox
            value={district}
            onChange={setDistrict}
            options={getDistricts(city) as string[]}
            placeholder={city ? 'İlçe' : 'Önce il seçin'}
            disabled={!city}
            emptyText="Hazır liste yok — yazabilirsiniz."
          />
          <Button disabled={!city || !district} onClick={add}>Ekle</Button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-charcoal-900">📍 Lokasyon Bazlı Bölge Ekle</h3>
        <p className="mt-1 text-xs text-charcoal-500">
          Merkez konumunuzu belirleyin ve yarıçap seçin. Sadece bu daire içindeki
          talepler size düşer (talep konumu paylaşılmışsa).
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Ad (örn: Merkez Ofis, Şube 1)">
            <Input
              value={locLabel}
              onChange={(e) => setLocLabel(e.target.value)}
              placeholder="Bölgeye bir ad verin"
            />
          </Field>
          <div>
            <div className="label">Konum</div>
            <LocationButton
              onLocation={(lat, lng, rev) => {
                setLocLatLng({ lat, lng });
                if (!locLabel && rev?.city) {
                  setLocLabel(`${rev.neighborhood ?? rev.district ?? rev.city}`);
                }
              }}
            />
            {locLatLng && <LocationChip lat={locLatLng.lat} lng={locLatLng.lng} />}
          </div>
          <Field label={`Yarıçap: ${locRadius} km`}>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={locRadius}
              onChange={(e) => setLocRadius(Number(e.target.value))}
              className="w-full accent-sunset-500"
            />
            <div className="mt-1 flex justify-between text-[10px] text-charcoal-400">
              <span>1 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </Field>
          <Button disabled={!locLatLng || !locLabel} onClick={addLocationRegion}>
            Lokasyon Bölgesi Ekle
          </Button>
        </div>
      </div>
    </div>
  );
}

function SifreTab({ onOk, onErr }: { onOk: (s: string) => void; onErr: (s: string) => void }) {
  const [current, setCurrent] = useState('');
  const [next1, setNext1] = useState('');
  const [next2, setNext2] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (next1 !== next2) return onErr('Yeni şifreler eşleşmiyor');
    if (!/^\d{6}$/.test(next1)) return onErr('Yeni şifre 6 rakam olmalı');
    const token = providerSession.get();
    if (!token) return;
    setLoading(true);
    try {
      await apiPost('/me/password', { currentPassword: current, newPassword: next1 }, token);
      onOk('Şifre değiştirildi.');
      setCurrent('');
      setNext1('');
      setNext2('');
    } catch (e) {
      onErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-lg font-bold text-charcoal-900">Şifre Değiştir</h2>
      <Field label="Mevcut Şifre (6 rakam)">
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={current}
          onChange={(e) => setCurrent(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
        />
      </Field>
      <Field label="Yeni Şifre (6 rakam)">
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={next1}
          onChange={(e) => setNext1(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
        />
      </Field>
      <Field label="Yeni Şifre (Tekrar)">
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={next2}
          onChange={(e) => setNext2(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
        />
      </Field>
      <Button disabled={loading || current.length !== 6 || next1.length !== 6 || next1 !== next2} onClick={save}>
        Şifreyi Güncelle
      </Button>
    </div>
  );
}
