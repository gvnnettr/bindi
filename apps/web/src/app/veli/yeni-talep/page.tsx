'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { parentSession } from '@/lib/session';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { Combobox } from '@/components/Combobox';
import { LocationButton, LocationChip } from '@/components/LocationButton';
import {
  PICKUP_TYPE,
  TURKEY_CITIES,
  getDistricts,
  getNeighborhoods,
} from '@servis/shared';

interface Student {
  id: string;
  name: string;
  school: { name: string } | null;
  isPrimary: boolean;
}

export default function NewRequestPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [address, setAddress] = useState('');
  const [pickupType, setPickupType] = useState<string>(PICKUP_TYPE.BOTH);
  const [notes, setNotes] = useState('');
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = parentSession.get();
    if (!token) return;
    apiGet<Student[]>('/me/parent/students', token)
      .then((data) => setStudents(data.filter((s) => s.isPrimary)))
      .catch((e) => setError((e as Error).message));
  }, []);

  async function submit() {
    const token = parentSession.get();
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const r = await apiPost<{ id: string; magicToken: string }>(
        '/me/parent/requests',
        {
          studentIds: selectedStudentIds,
          city,
          district,
          neighborhood,
          address: [street, address].filter(Boolean).join(' — ') || address,
          pickupType,
          notes: notes || undefined,
          latitude: latLng?.lat,
          longitude: latLng?.lng,
        },
        token,
      );
      router.push('/veli');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const valid =
    selectedStudentIds.length > 0 &&
    city &&
    district &&
    neighborhood &&
    (street.length > 0 || address.length >= 5);


  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-charcoal-900">Öğrenciler</h2>
          <p className="mt-1 text-xs text-charcoal-500">
            Bu talep için servis isteyeceğiniz öğrencileri seçin.
          </p>
        </div>
        <div className="space-y-1 rounded-lg border border-charcoal-200 bg-white p-3">
          {students.length === 0 ? (
            <div className="p-4 text-center text-sm text-charcoal-500">
              Henüz öğrenciniz yok.{' '}
              <Link href="/veli/ogrenciler" className="text-sunset-600 hover:text-sunset-700 underline">
                Öğrenci ekleyin
              </Link>
            </div>
          ) : (
            students.map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(s.id)}
                  onChange={(e) =>
                    setSelectedStudentIds(
                      e.target.checked
                        ? [...selectedStudentIds, s.id]
                        : selectedStudentIds.filter((x) => x !== s.id),
                    )
                  }
                />
                <span>
                  <strong>{s.name}</strong>
                  {s.school && (
                    <span className="text-charcoal-500"> — {s.school.name}</span>
                  )}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-bold text-charcoal-900">Adres</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="İl">
            <Combobox
              value={city}
              onChange={(v) => {
                setCity(v);
                if (getDistricts(v).length && !getDistricts(v).includes(district)) {
                  setDistrict('');
                }
              }}
              options={TURKEY_CITIES as unknown as string[]}
              placeholder="Ara ya da yaz"
              allowFreeText
            />
          </Field>
          <Field label="İlçe">
            <Combobox
              value={district}
              onChange={setDistrict}
              options={getDistricts(city) as string[]}
              placeholder={city ? 'Ara ya da yaz' : 'Önce il seçin'}
              allowFreeText
              disabled={!city}
              emptyText="Bu il için hazır liste yok — yazabilirsiniz."
            />
          </Field>
        </div>
        <Field
          label="Mahalle"
          hint={
            district
              ? getNeighborhoods(city, district).length
                ? 'Listeden seçin veya yazın.'
                : 'Hazır liste yok — yazabilirsiniz.'
              : 'Önce ilçe seçin'
          }
        >
          <Combobox
            value={neighborhood}
            onChange={setNeighborhood}
            options={getNeighborhoods(city, district) as string[]}
            placeholder="Mahalle"
            disabled={!city || !district}
            emptyText="Hazır liste yok — yazdığınız değerle kaydedilir."
          />
        </Field>
        <Field label="Sokak / Cadde (opsiyonel)">
          <Input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Örn: Atatürk Bulvarı"
            disabled={!city || !district}
          />
        </Field>
        <Field label="Bina No / Kapı No / Tarif">
          <Textarea
            rows={2}
            placeholder="Örn: 15/A, blok B daire 4, market karşısı"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
        <div>
          <div className="label">Konum (opsiyonel)</div>
          <LocationButton
            onLocation={(lat, lng, rev) => {
              setLatLng({ lat, lng });
              if (rev) {
                if (rev.city) {
                  const match = TURKEY_CITIES.find(
                    (c) => c.toLocaleLowerCase('tr') === rev.city!.toLocaleLowerCase('tr'),
                  );
                  setCity(match ?? rev.city);
                }
                if (rev.district) {
                  const cityKey = city || rev.city || '';
                  const list = getDistricts(cityKey);
                  const match = list.find(
                    (d) => d.toLocaleLowerCase('tr') === rev.district!.toLocaleLowerCase('tr'),
                  );
                  setDistrict(match ?? rev.district);
                }
                if (rev.neighborhood) setNeighborhood(rev.neighborhood);
                if (rev.street && !street) setStreet(rev.street);
              }
            }}
          />
          {latLng && <LocationChip lat={latLng.lat} lng={latLng.lng} />}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-bold text-charcoal-900">Tercihler</h2>
        <Field label="Servis Tipi">
          <Select value={pickupType} onChange={(e) => setPickupType(e.target.value)}>
            <option value={PICKUP_TYPE.BOTH}>Gidiş + Dönüş</option>
            <option value={PICKUP_TYPE.MORNING_ONLY}>Sadece Gidiş</option>
            <option value={PICKUP_TYPE.AFTERNOON_ONLY}>Sadece Dönüş</option>
          </Select>
        </Field>
        <Field label="Ek Notlar (opsiyonel)">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/veli" className="btn-secondary">
          Vazgeç
        </Link>
        <Button disabled={loading || !valid} onClick={submit}>
          Talebi Gönder
        </Button>
      </div>
    </div>
  );
}
