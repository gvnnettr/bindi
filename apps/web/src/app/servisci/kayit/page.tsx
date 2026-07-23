'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { Combobox } from '@/components/Combobox';
import { PhoneInput, toBackendPhone } from '@/components/PhoneInput';
import { PACKAGE_CODES, TURKEY_CITIES, getDistricts } from '@servis/shared';

type Step =
  | 'phone'
  | 'otp'
  | 'company'
  | 'schools'
  | 'regions'
  | 'documents'
  | 'packages'
  | 'receipt'
  | 'done';

interface School {
  id: string;
  name: string;
  city: string;
  district: string;
}
interface Package {
  code: string;
  name: string;
  monthlyPrice: string;
}
interface DocDef {
  id: string;
  code: string;
  name: string;
  scope: string;
  required: boolean;
  requiresExpiry: boolean;
  description: string | null;
  sortOrder: number;
}
interface UploadedDoc {
  definitionId: string;
  fileUrl: string;
  originalName: string;
  issuedAt?: string;
  expiresAt?: string;
}

export default function ProviderRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);

  const [regions, setRegions] = useState<Array<{ city: string; district: string }>>([
    { city: '', district: '' },
  ]);

  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([PACKAGE_CODES.TEKLIF]);

  const [receiptUrl, setReceiptUrl] = useState('');

  const [docDefs, setDocDefs] = useState<DocDef[]>([]);
  const [uploads, setUploads] = useState<Record<string, UploadedDoc>>({});

  useEffect(() => {
    apiGet<School[]>('/schools/public').then(setSchools).catch(() => {});
    apiGet<Array<{ code: string; name: string; monthlyPrice: number }>>(
      '/public-packages',
    )
      .then((rows) => {
        if (rows.length > 0) {
          setPackages(
            rows.map((r) => ({
              code: r.code,
              name: r.name,
              monthlyPrice: String(r.monthlyPrice),
            })),
          );
        } else {
          setPackages([
            { code: PACKAGE_CODES.TEKLIF, name: 'Teklif Paketi', monthlyPrice: '250.00' },
            { code: PACKAGE_CODES.TAKIP, name: 'Takip Paketi', monthlyPrice: '450.00' },
          ]);
        }
      })
      .catch(() => {});
    apiGet<DocDef[]>('/document-definitions')
      .then((rows) => setDocDefs(rows.filter((r) => r.scope === 'company')))
      .catch(() => {});
  }, []);

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

  async function sendOtp() {
    const r = await safe(() =>
      apiPost<{ phone: string; testCode?: string }>('/otp/send', {
        phone: toBackendPhone(phone),
        purpose: 'provider_register',
      }),
    );
    if (r) {
      if (r.testCode) {
        setTestCode(r.testCode);
        setOtp(r.testCode);
      }
      setStep('otp');
    }
  }

  async function verifyOtp() {
    const r = await safe(() =>
      apiPost<{ token: string }>('/otp/verify', {
        phone: toBackendPhone(phone),
        purpose: 'provider_register',
        code: otp,
      }),
    );
    if (r) {
      setToken(r.token);
      setStep('company');
    }
  }

  async function uploadDoc(def: DocDef, file: File): Promise<void> {
    const fd = new FormData();
    fd.append('file', file);
    setError(null);
    setLoading(true);
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${base}/api/providers/upload/document`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(JSON.parse(t)?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUploads((prev) => ({
        ...prev,
        [def.id]: {
          definitionId: def.id,
          fileUrl: data.fileUrl,
          originalName: data.originalName,
          expiresAt: prev[def.id]?.expiresAt,
          issuedAt: prev[def.id]?.issuedAt,
        },
      }));
    } catch (e) {
      setError('Yükleme başarısız: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function updateDocMeta(defId: string, field: 'issuedAt' | 'expiresAt', value: string) {
    setUploads((prev) => {
      const cur = prev[defId];
      if (!cur) return prev;
      return { ...prev, [defId]: { ...cur, [field]: value } };
    });
  }

  async function submit() {
    if (!token) return;
    // Zorunlu belgeler yüklendi mi kontrolü
    const missing = docDefs
      .filter((d) => d.required)
      .filter((d) => !uploads[d.id]);
    if (missing.length > 0) {
      setError(
        'Zorunlu belgeler eksik: ' + missing.map((d) => d.name).join(', '),
      );
      setStep('documents');
      return;
    }
    const documents = Object.values(uploads);
    const r = await safe(() =>
      apiPost<{ providerId: string }>('/providers/register', {
        verificationToken: token,
        companyName,
        taxNo: taxNo || undefined,
        ownerName,
        email: email || undefined,
        address: address || undefined,
        schoolIds: selectedSchoolIds,
        regions: regions.filter((r) => r.city && r.district),
        packages: selectedPackages,
        receiptUrl: receiptUrl || undefined,
        documents,
      }),
    );
    if (r) setStep('done');
  }

  const totalPrice = selectedPackages
    .map((c) => packages.find((p) => p.code === c)?.monthlyPrice ?? '0')
    .reduce((s, p) => s + Number(p), 0);

  const requiredDocs = docDefs.filter((d) => d.required);
  const optionalDocs = docDefs.filter((d) => !d.required);
  const uploadedRequired = requiredDocs.filter((d) => uploads[d.id]).length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold">Servisçi Ön Kayıt</h1>
      <p className="mb-6 text-sm text-slate-600">
        Belgeleriniz incelendikten sonra hesabınız aktif edilir ve giriş bilgileriniz SMS ile iletilir.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 'phone' && (
        <Card title="Telefon Doğrulama">
          <Field label="Telefon">
            <PhoneInput value={phone} onChange={setPhone} />
          </Field>
          <Button disabled={loading || phone.length !== 10} onClick={sendOtp}>
            SMS Gönder
          </Button>
        </Card>
      )}

      {step === 'otp' && (
        <Card title="Doğrulama Kodu">
          {testCode && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              🧪 Test Modu — Kod: <span className="font-mono font-bold">{testCode}</span>
            </div>
          )}
          <Field label="Kod">
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
          </Field>
          <Button disabled={loading || otp.length !== 6} onClick={verifyOtp}>
            Doğrula
          </Button>
        </Card>
      )}

      {step === 'company' && (
        <Card title="Firma Bilgileri">
          <Field label="Firma Ünvanı">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </Field>
          <Field label="Vergi No (opsiyonel)">
            <Input value={taxNo} onChange={(e) => setTaxNo(e.target.value)} />
          </Field>
          <Field label="Yetkili Ad Soyad">
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </Field>
          <Field label="E-posta (opsiyonel)">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Adres (opsiyonel)">
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </Field>
          <Button
            disabled={!companyName || !ownerName}
            onClick={() => setStep('schools')}
          >
            Devam
          </Button>
        </Card>
      )}

      {step === 'schools' && (
        <Card title="Hizmet Verdiğiniz Okullar">
          <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 p-3">
            {schools.map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedSchoolIds.includes(s.id)}
                  onChange={(e) =>
                    setSelectedSchoolIds((prev) =>
                      e.target.checked
                        ? [...prev, s.id]
                        : prev.filter((x) => x !== s.id),
                    )
                  }
                />
                <span>
                  {s.name} — {s.city}/{s.district}
                </span>
              </label>
            ))}
            {schools.length === 0 && (
              <div className="text-sm text-slate-500">
                Henüz okul yok. Admin'in okul eklemesi gerekiyor.
              </div>
            )}
          </div>
          <Button
            disabled={selectedSchoolIds.length === 0}
            onClick={() => setStep('regions')}
          >
            Devam ({selectedSchoolIds.length} okul seçildi)
          </Button>
        </Card>
      )}

      {step === 'regions' && (
        <Card title="Hizmet Verdiğiniz Bölgeler">
          {regions.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <Combobox
                value={r.city}
                onChange={(v) =>
                  setRegions((prev) =>
                    prev.map((p, idx) =>
                      idx === i
                        ? {
                            ...p,
                            city: v,
                            district:
                              getDistricts(v).length &&
                              !getDistricts(v).includes(p.district)
                                ? ''
                                : p.district,
                          }
                        : p,
                    ),
                  )
                }
                options={TURKEY_CITIES as unknown as string[]}
                placeholder="İl"
              />
              <Combobox
                value={r.district}
                onChange={(v) =>
                  setRegions((prev) =>
                    prev.map((p, idx) => (idx === i ? { ...p, district: v } : p)),
                  )
                }
                options={getDistricts(r.city) as string[]}
                placeholder={r.city ? 'İlçe' : 'Önce il'}
                disabled={!r.city}
                emptyText="Bu il için hazır liste yok — yazabilirsiniz."
              />
              {regions.length > 1 && (
                <button
                  type="button"
                  className="pt-2 text-xs text-red-600 hover:underline"
                  onClick={() => setRegions((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  Sil
                </button>
              )}
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() => setRegions((prev) => [...prev, { city: '', district: '' }])}
          >
            + Bölge Ekle
          </Button>
          <Button
            disabled={!regions.every((r) => r.city && r.district)}
            onClick={() => setStep('documents')}
          >
            Devam
          </Button>
        </Card>
      )}

      {step === 'documents' && (
        <Card title={`Şirket Belgeleri (${uploadedRequired}/${requiredDocs.length} zorunlu tamam)`}>
          <p className="text-sm text-slate-600">
            Aşağıdaki belgeleri yükleyin. Zorunlu olanlar (<span className="text-red-500">*</span>) tamamlanmadan ön kayıt gönderilemez.
            PDF/JPG/PNG kabul edilir, max 10 MB.
          </p>

          <div className="space-y-3">
            {[...requiredDocs, ...optionalDocs].map((def) => (
              <DocumentRow
                key={def.id}
                def={def}
                uploaded={uploads[def.id]}
                onUpload={(f) => uploadDoc(def, f)}
                onRemove={() =>
                  setUploads((prev) => {
                    const n = { ...prev };
                    delete n[def.id];
                    return n;
                  })
                }
                onMeta={(field, value) => updateDocMeta(def.id, field, value)}
                loading={loading}
              />
            ))}
            {docDefs.length === 0 && (
              <div className="text-sm text-slate-500">
                Belge tanımı yükleniyor…
              </div>
            )}
          </div>

          <Button
            disabled={uploadedRequired < requiredDocs.length}
            onClick={() => setStep('packages')}
          >
            Devam ({uploadedRequired}/{requiredDocs.length} zorunlu)
          </Button>
        </Card>
      )}

      {step === 'packages' && (
        <Card title="Paket Seçimi">
          <p className="text-sm text-slate-600">
            Teklif Paketi zorunludur. Takip Paketi öğrenci/ödeme yönetimi için ayrıca alınır.
          </p>
          {packages.map((p) => (
            <label
              key={p.code}
              className="flex items-center justify-between rounded-md border border-slate-200 p-3"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedPackages.includes(p.code)}
                  disabled={p.code === PACKAGE_CODES.TEKLIF}
                  onChange={(e) =>
                    setSelectedPackages((prev) =>
                      e.target.checked
                        ? [...prev, p.code]
                        : prev.filter((x) => x !== p.code),
                    )
                  }
                />
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {Number(p.monthlyPrice).toLocaleString('tr-TR')} ₺/ay
                  </div>
                </div>
              </div>
            </label>
          ))}
          <div className="rounded-md bg-slate-100 p-3 text-sm">
            Toplam aylık: <strong>{totalPrice.toLocaleString('tr-TR')} ₺</strong>
          </div>
          <Button onClick={() => setStep('receipt')}>Devam</Button>
        </Card>
      )}

      {step === 'receipt' && (
        <Card title="Ödeme (Opsiyonel — Onay sonrası da tamamlayabilirsiniz)">
          <p className="text-sm text-slate-600">
            Havale/EFT bilgileriyle ödeme yaptıysanız dekont linkinizi
            paylaşabilirsiniz. Eksik olsa da ön kaydınızı gönderebilirsiniz.
          </p>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
            <div>Ziraat Bankası — Bindi</div>
            <div>IBAN: TR00 0000 0000 0000 0000 0000 00</div>
            <div className="mt-1 text-xs text-slate-500">
              Açıklama olarak firma ünvanınızı yazın.
            </div>
          </div>
          <Field label="Dekont Linki (opsiyonel)">
            <Input
              placeholder="https://…"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
            />
          </Field>
          <Button disabled={loading} onClick={submit}>
            Ön Kaydı Gönder
          </Button>
        </Card>
      )}

      {step === 'done' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="text-4xl">✓</div>
          <h2 className="mt-3 text-lg font-semibold text-emerald-900">
            Kaydınız Alındı
          </h2>
          <p className="mt-3 text-sm text-slate-700">
            Belgeleriniz incelenecek. Onay sonrası **giriş bilgileriniz SMS ile**
            iletilecek. Sonrasında{' '}
            <a href="/servisci/giris" className="text-brand-600 underline">
              buradan giriş yapabilirsiniz
            </a>
            .
          </p>
        </div>
      )}
    </main>
  );
}

function DocumentRow({
  def,
  uploaded,
  onUpload,
  onRemove,
  onMeta,
  loading,
}: {
  def: DocDef;
  uploaded?: UploadedDoc;
  onUpload: (f: File) => void;
  onRemove: () => void;
  onMeta: (field: 'issuedAt' | 'expiresAt', value: string) => void;
  loading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={
        'rounded-lg border p-3 ' +
        (uploaded
          ? 'border-emerald-200 bg-emerald-50/50'
          : def.required
            ? 'border-amber-200 bg-amber-50/40'
            : 'border-slate-200 bg-white')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {def.name}
            {def.required && <span className="ml-1 text-red-500">*</span>}
          </div>
          {def.description && (
            <div className="mt-0.5 text-xs text-slate-500">{def.description}</div>
          )}
        </div>
        {uploaded ? (
          <div className="text-right">
            <div className="text-xs font-semibold text-emerald-700">
              ✓ Yüklendi
            </div>
            <button
              onClick={onRemove}
              className="mt-1 text-[11px] font-semibold text-red-600 hover:text-red-700"
            >
              Kaldır
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Dosya Seç
            </button>
          </div>
        )}
      </div>
      {uploaded && (
        <div className="mt-2 text-xs text-slate-600">
          <span className="font-mono">{uploaded.originalName}</span>
          {def.requiresExpiry && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label>
                <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Veriliş
                </div>
                <input
                  type="date"
                  value={uploaded.issuedAt ?? ''}
                  onChange={(e) => onMeta('issuedAt', e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                />
              </label>
              <label>
                <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Bitiş
                </div>
                <input
                  type="date"
                  value={uploaded.expiresAt ?? ''}
                  onChange={(e) => onMeta('expiresAt', e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
