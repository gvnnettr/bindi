'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { Combobox } from '@/components/Combobox';
import { PhoneInput, toBackendPhone } from '@/components/PhoneInput';
import { LocationButton, LocationChip } from '@/components/LocationButton';
import {
  PICKUP_TYPE,
  TURKEY_CITIES,
  getDistricts,
  getNeighborhoods,
} from '@servis/shared';

type Step = 'phone' | 'otp' | 'existing' | 'parent' | 'students' | 'address' | 'preferences' | 'summary';

interface School {
  id: string;
  name: string;
  city: string;
  district: string;
}

interface StudentDraft {
  name: string;
  class: string;
  schoolId: string;
}

export default function TeklifAlPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<StudentDraft[]>([
    { name: '', class: '', schoolId: '' },
  ]);

  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [address, setAddress] = useState('');

  const [pickupType, setPickupType] = useState<string>(PICKUP_TYPE.BOTH);
  const [notes, setNotes] = useState('');
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const [enabledCities, setEnabledCities] = useState<string[]>([]);

  useEffect(() => {
    apiGet<School[]>('/schools/public').then(setSchools).catch(() => setSchools([]));
    apiGet<string[]>('/cities/public')
      .then((c) => setEnabledCities(c ?? []))
      .catch(() => setEnabledCities([]));
  }, []);

  // Admin şehir listesi tanımladıysa onu kullan; boşsa fallback tüm Türkiye illeri
  const cityOptions = enabledCities.length > 0 ? enabledCities : (TURKEY_CITIES as unknown as string[]);

  async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
    setError(null);
    setLoading(true);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  const [testCode, setTestCode] = useState<string | null>(null);

  async function sendOtp() {
    setError(null);
    setLoading(true);
    try {
      // Önce mevcut kayıt kontrolü — varsa panele yönlendir, SMS harcamayalım
      try {
        const c = await apiPost<{ exists: boolean; hasPassword: boolean }>(
          '/parents/login/check',
          { phone: toBackendPhone(phone) },
        );
        if (c.exists) {
          setStep('existing');
          return;
        }
      } catch {}
      const r = await apiPost<{ phone: string; testCode?: string }>(
        '/otp/send',
        { phone: toBackendPhone(phone), purpose: 'parent_request' },
      );
      if (r.testCode) {
        setTestCode(r.testCode);
        setOtp(r.testCode);
      }
      setStep('otp');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    const r = await safe(() =>
      apiPost<{ token: string; phone: string }>('/otp/verify', {
        phone: toBackendPhone(phone),
        purpose: 'parent_request',
        code: otp,
      }),
    );
    if (r) {
      setToken(r.token);
      // Sistemde kayıtlıysa panele yönlendir seçeneği göster
      try {
        const c = await apiPost<{ exists: boolean; hasPassword: boolean }>(
          '/parents/login/check',
          { phone: toBackendPhone(phone) },
        );
        if (c.exists) {
          setStep('existing');
          return;
        }
      } catch {}
      setStep('parent');
    }
  }

  async function submit() {
    if (!token) return;
    const r = await safe(() =>
      apiPost<{ id: string; magicToken: string }>('/requests', {
        verificationToken: token,
        parentName,
        parentEmail: parentEmail || undefined,
        students: students
          .filter((s) => s.name && s.schoolId)
          .map((s) => ({
            name: s.name,
            class: s.class || undefined,
            schoolId: s.schoolId,
          })),
        city,
        district,
        neighborhood,
        address: [street, address].filter(Boolean).join(' — ') || address,
        pickupType,
        notes: notes || undefined,
        latitude: latLng?.lat,
        longitude: latLng?.lng,
      }),
    );
    if (r) router.push(`/teklif-al/tesekkurler?token=${r.magicToken}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <StepDot active={step === 'phone' || step === 'otp'}>1</StepDot>
        <div className="h-px flex-1 bg-slate-200" />
        <StepDot active={step === 'parent'}>2</StepDot>
        <div className="h-px flex-1 bg-slate-200" />
        <StepDot active={step === 'students'}>3</StepDot>
        <div className="h-px flex-1 bg-slate-200" />
        <StepDot active={step === 'address' || step === 'preferences'}>4</StepDot>
        <div className="h-px flex-1 bg-slate-200" />
        <StepDot active={step === 'summary'}>5</StepDot>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 'phone' && (
        <StepCard title="Telefon numaranız" desc="Doğrulama kodu SMS ile gönderilir.">
          <Field label="Telefon">
            <PhoneInput value={phone} onChange={setPhone} />
          </Field>
          <Button disabled={loading || phone.length !== 10} onClick={sendOtp}>
            Kod Gönder
          </Button>
        </StepCard>
      )}

      {step === 'otp' && (
        <StepCard title="SMS Doğrulama" desc={`+90 ${phone} numarasına gelen 6 haneli kodu girin.`}>
          {testCode && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="font-semibold">🧪 Test Modu</div>
              <div className="mt-0.5">
                Kod: <span className="font-mono font-bold">{testCode}</span> (otomatik dolduruldu)
              </div>
            </div>
          )}
          <Field label="Kod">
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('phone')}>
              Geri
            </Button>
            <Button disabled={loading || otp.length !== 6} onClick={verifyOtp}>
              Doğrula
            </Button>
          </div>
        </StepCard>
      )}

      {step === 'existing' && (
        <StepCard
          title="Zaten bir hesabınız var"
          desc="Sistemde kayıtlı olduğunuzu tespit ettik. Panelden yeni bir talep açmak daha kolay olur — öğrencileriniz kayıtlı, adres bilgilerini tekrar girmenize gerek yok."
        >
          <div className="grid gap-3">
            <Button onClick={() => (window.location.href = '/veli/giris')}>
              Panele Gir (önerilir)
            </Button>
            <Button variant="secondary" onClick={() => setStep('parent')}>
              Bu akışa devam et (yeni talep aç)
            </Button>
          </div>
        </StepCard>
      )}

      {step === 'parent' && (
        <StepCard title="Veli Bilgileri" desc="">
          <Field label="Ad Soyad">
            <Input value={parentName} onChange={(e) => setParentName(e.target.value)} />
          </Field>
          <Field label="E-posta (opsiyonel)">
            <Input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
            />
          </Field>
          <Button disabled={!parentName} onClick={() => setStep('students')}>
            Devam
          </Button>
        </StepCard>
      )}

      {step === 'students' && (
        <StepCard title="Öğrenci Bilgileri" desc="Bir veya birden fazla öğrenci ekleyebilirsiniz.">
          {students.map((s, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Öğrenci {i + 1}</div>
                {students.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() =>
                      setStudents((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    Kaldır
                  </button>
                )}
              </div>
              <Field label="Ad Soyad">
                <Input
                  value={s.name}
                  onChange={(e) =>
                    setStudents((prev) =>
                      prev.map((p, idx) => (idx === i ? { ...p, name: e.target.value } : p)),
                    )
                  }
                />
              </Field>
              <Field label="Sınıf (opsiyonel)">
                <Input
                  value={s.class}
                  onChange={(e) =>
                    setStudents((prev) =>
                      prev.map((p, idx) => (idx === i ? { ...p, class: e.target.value } : p)),
                    )
                  }
                />
              </Field>
              <Field label="Okul">
                <Select
                  value={s.schoolId}
                  onChange={(e) =>
                    setStudents((prev) =>
                      prev.map((p, idx) => (idx === i ? { ...p, schoolId: e.target.value } : p)),
                    )
                  }
                >
                  <option value="">— Okul seçin —</option>
                  {schools.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.name} — {sch.city}/{sch.district}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              setStudents((prev) => [...prev, { name: '', class: '', schoolId: '' }])
            }
          >
            + Öğrenci Ekle
          </Button>
          <Button
            disabled={!students.every((s) => s.name && s.schoolId)}
            onClick={() => setStep('address')}
          >
            Devam
          </Button>
        </StepCard>
      )}

      {step === 'address' && (
        <StepCard title="Adres" desc="Servisin başlayacağı adres.">
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
                options={cityOptions}
                placeholder={enabledCities.length > 0 ? 'Şehir seç' : 'Ara ya da yaz'}
              />
            </Field>
            <Field label="İlçe">
              <Combobox
                value={district}
                onChange={setDistrict}
                options={getDistricts(city) as string[]}
                placeholder={city ? 'Ara ya da yaz' : 'Önce il seçin'}
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
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Örn: 15/A, blok B daire 4, market karşısı"
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
          <Button
            disabled={!city || !district || !neighborhood || (!street && address.length < 5)}
            onClick={() => setStep('preferences')}
          >
            Devam
          </Button>
        </StepCard>
      )}

      {step === 'preferences' && (
        <StepCard title="Servis Tercihleri" desc="">
          <Field label="Servis Tipi">
            <Select value={pickupType} onChange={(e) => setPickupType(e.target.value)}>
              <option value={PICKUP_TYPE.BOTH}>Gidiş + Dönüş</option>
              <option value={PICKUP_TYPE.MORNING_ONLY}>Sadece Gidiş</option>
              <option value={PICKUP_TYPE.AFTERNOON_ONLY}>Sadece Dönüş</option>
            </Select>
          </Field>
          <Field label="Ek Notlar (opsiyonel)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </Field>
          <Button onClick={() => setStep('summary')}>Devam</Button>
        </StepCard>
      )}

      {step === 'summary' && (
        <StepCard title="Özet" desc="Bilgilerinizi kontrol edin ve gönderin.">
          <SummaryRow label="Veli" value={parentName} />
          <SummaryRow label="Telefon" value={`+90 ${phone}`} />
          <SummaryRow
            label="Öğrenciler"
            value={students
              .map(
                (s) =>
                  `${s.name}${s.class ? ` (${s.class})` : ''} — ${
                    schools.find((sc) => sc.id === s.schoolId)?.name ?? ''
                  }`,
              )
              .join(', ')}
          />
          <SummaryRow label="Adres" value={`${neighborhood}, ${district}/${city} — ${address}`} />
          <SummaryRow label="Servis Tipi" value={pickupType} />
          {notes && <SummaryRow label="Notlar" value={notes} />}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep('preferences')}>
              Geri
            </Button>
            <Button disabled={loading} onClick={submit}>
              Talebi Gönder
            </Button>
          </div>
        </StepCard>
      )}
    </main>
  );
}

function StepCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {desc && <p className="mt-1 text-sm text-slate-600">{desc}</p>}
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function StepDot({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <div
      className={
        active
          ? 'flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white'
          : 'flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500'
      }
    >
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col border-b border-slate-100 py-2 last:border-b-0">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}
