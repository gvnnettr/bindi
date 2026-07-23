'use client';

import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPatch, apiPost, apiUpload } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';

type Values = Record<string, string>;
type Tab = 'site' | 'sms' | 'mail' | 'bank';

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Values>({});
  const [tab, setTab] = useState<Tab>('site');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    try {
      const data = await apiGet<Values>('/admin/settings', token);
      setValues(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function set(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function save() {
    const token = adminSession.get();
    if (!token) return;
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const data = await apiPatch<Values>('/admin/settings', { values }, token);
      setValues(data);
      setNotice('Ayarlar kaydedildi.');
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function testSms() {
    const token = adminSession.get();
    if (!token) return;
    const phone = prompt('Test SMS gönderilecek telefon (05xx...):');
    if (!phone) return;
    setNotice(null);
    setError(null);
    try {
      const r = await apiPost<{ ok: boolean; provider?: string; error?: string }>(
        '/admin/settings/test-sms',
        { phone },
        token,
      );
      if (r.ok) setNotice(`SMS gönderildi (${r.provider}).`);
      else setError('SMS başarısız: ' + (r.error ?? 'bilinmeyen hata'));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function testMail() {
    const token = adminSession.get();
    if (!token) return;
    const email = prompt('Test e-postası gönderilecek adres:');
    if (!email) return;
    setNotice(null);
    setError(null);
    try {
      const r = await apiPost<{ ok: boolean; error?: string }>(
        '/admin/settings/test-mail',
        { email },
        token,
      );
      if (r.ok) setNotice('E-posta gönderildi.');
      else setError('Mail başarısız: ' + (r.error ?? 'bilinmeyen hata'));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
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

      <div className="flex gap-2 border-b border-charcoal-200">
        <TabBtn active={tab === 'site'} onClick={() => setTab('site')}>Site</TabBtn>
        <TabBtn active={tab === 'sms'} onClick={() => setTab('sms')}>SMS</TabBtn>
        <TabBtn active={tab === 'mail'} onClick={() => setTab('mail')}>E-posta</TabBtn>
        <TabBtn active={tab === 'bank'} onClick={() => setTab('bank')}>Havale / Banka</TabBtn>
      </div>

      {tab === 'site' && (
        <>
          <Section title="Genel Site Ayarları" desc="Site adı, iletişim ve destek bilgileri.">
            <Field label="Site Adı">
              <Input value={values['site.name'] ?? ''} onChange={(e) => set('site.name', e.target.value)} />
            </Field>
            <Field label="Slogan">
              <Input value={values['site.tagline'] ?? ''} onChange={(e) => set('site.tagline', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Destek E-postası">
                <Input type="email" value={values['site.support_email'] ?? ''} onChange={(e) => set('site.support_email', e.target.value)} />
              </Field>
              <Field label="Destek Telefonu">
                <Input value={values['site.support_phone'] ?? ''} onChange={(e) => set('site.support_phone', e.target.value)} />
              </Field>
            </div>
            <Field label="Adres">
              <Textarea rows={2} value={values['site.address'] ?? ''} onChange={(e) => set('site.address', e.target.value)} />
            </Field>
          </Section>
          <Section
            title="Logo Yönetimi"
            desc="Header ve footer için ayrı logo yükleyebilirsiniz. Logo yüklenmezse mevcut yazı tipi logo kullanılır. Önerilen: yatay format PNG/SVG, arka planı şeffaf."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <LogoUploader
                target="header"
                label="Header (Üst Menü) Logosu"
                currentUrl={values['site.logo.header_url']}
                onChange={(url) => set('site.logo.header_url', url)}
                onError={setError}
                onNotice={setNotice}
              />
              <LogoUploader
                target="footer"
                label="Footer (Alt Menü) Logosu"
                currentUrl={values['site.logo.footer_url']}
                onChange={(url) => set('site.logo.footer_url', url)}
                onError={setError}
                onNotice={setNotice}
                dark
              />
            </div>
          </Section>
        </>
      )}

      {tab === 'sms' && (
        <Section
          title="SMS Ayarları"
          desc="Netgsm entegrasyonu. Şifreyi boş bırakırsanız mevcut değer korunur."
          headerRight={<Button variant="secondary" onClick={testSms}>Test SMS Gönder</Button>}
        >
          <Toggle
            label="SMS Aktif"
            checked={values['sms.enabled'] === 'true'}
            onChange={(v) => set('sms.enabled', v ? 'true' : 'false')}
          />
          <Toggle
            label="🧪 Test Modu — SMS gönderilmez, kod ekranda görünür"
            checked={values['sms.test_mode'] === 'true'}
            onChange={(v) => set('sms.test_mode', v ? 'true' : 'false')}
          />
          <Field label="Sağlayıcı">
            <Select value={values['sms.provider'] ?? 'stub'} onChange={(e) => set('sms.provider', e.target.value)}>
              <option value="stub">Stub (test — konsola yazar)</option>
              <option value="netgsm">NetGSM</option>
            </Select>
          </Field>
          {values['sms.provider'] === 'netgsm' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="NetGSM Kullanıcı Adı">
                  <Input value={values['sms.netgsm.user'] ?? ''} onChange={(e) => set('sms.netgsm.user', e.target.value)} />
                </Field>
                <Field label="NetGSM Şifre" hint="Boş bırakırsanız mevcut şifre değişmez.">
                  <Input type="password" placeholder={values['sms.netgsm.pass'] === '••••••••' ? '(kaydedilmiş)' : ''} value={values['sms.netgsm.pass'] === '••••••••' ? '' : (values['sms.netgsm.pass'] ?? '')} onChange={(e) => set('sms.netgsm.pass', e.target.value)} />
                </Field>
              </div>
              <Field label="Başlık / Header" hint="NetGSM'de onaylı gönderici başlığı.">
                <Input value={values['sms.netgsm.header'] ?? ''} onChange={(e) => set('sms.netgsm.header', e.target.value)} />
              </Field>
            </>
          )}
        </Section>
      )}

      {tab === 'mail' && (
        <Section
          title="E-posta (SMTP) Ayarları"
          desc="Sistem e-postalarının gönderileceği SMTP hesabı."
          headerRight={<Button variant="secondary" onClick={testMail}>Test Mail Gönder</Button>}
        >
          <Toggle
            label="Mail Aktif"
            checked={values['mail.enabled'] === 'true'}
            onChange={(v) => set('mail.enabled', v ? 'true' : 'false')}
          />
          <Toggle
            label="🧪 Test Modu — Mail gönderilmez, sadece log'a yazılır"
            checked={values['mail.test_mode'] === 'true'}
            onChange={(v) => set('mail.test_mode', v ? 'true' : 'false')}
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="SMTP Host">
                <Input value={values['mail.smtp.host'] ?? ''} onChange={(e) => set('mail.smtp.host', e.target.value)} placeholder="mail.example.com" />
              </Field>
            </div>
            <Field label="Port">
              <Input value={values['mail.smtp.port'] ?? '587'} onChange={(e) => set('mail.smtp.port', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kullanıcı Adı">
              <Input value={values['mail.smtp.user'] ?? ''} onChange={(e) => set('mail.smtp.user', e.target.value)} />
            </Field>
            <Field label="Şifre" hint="Boş bırakırsanız mevcut şifre değişmez.">
              <Input type="password" placeholder={values['mail.smtp.pass'] === '••••••••' ? '(kaydedilmiş)' : ''} value={values['mail.smtp.pass'] === '••••••••' ? '' : (values['mail.smtp.pass'] ?? '')} onChange={(e) => set('mail.smtp.pass', e.target.value)} />
            </Field>
          </div>
          <Toggle
            label="Güvenli Bağlantı (SSL/TLS)"
            checked={values['mail.smtp.secure'] === 'true'}
            onChange={(v) => set('mail.smtp.secure', v ? 'true' : 'false')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gönderici E-posta">
              <Input type="email" value={values['mail.from.address'] ?? ''} onChange={(e) => set('mail.from.address', e.target.value)} />
            </Field>
            <Field label="Gönderici Ad">
              <Input value={values['mail.from.name'] ?? ''} onChange={(e) => set('mail.from.name', e.target.value)} />
            </Field>
          </div>
        </Section>
      )}

      {tab === 'bank' && (
        <Section title="Havale / Banka Bilgileri" desc="Servisçi kayıt akışında ödeme sayfasında gösterilir.">
          <Field label="Banka Adı">
            <Input value={values['bank.name'] ?? ''} onChange={(e) => set('bank.name', e.target.value)} />
          </Field>
          <Field label="Hesap Sahibi">
            <Input value={values['bank.holder'] ?? ''} onChange={(e) => set('bank.holder', e.target.value)} />
          </Field>
          <Field label="IBAN">
            <Input value={values['bank.iban'] ?? ''} onChange={(e) => set('bank.iban', e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" />
          </Field>
          <Field label="Açıklama Şablonu" hint="Havale yaparken açıklamaya ne yazılmalı?">
            <Input value={values['bank.note_template'] ?? ''} onChange={(e) => set('bank.note_template', e.target.value)} />
          </Field>
        </Section>
      )}

      <div className="flex justify-end gap-3 border-t border-charcoal-100 pt-4">
        <Button variant="secondary" onClick={load}>Vazgeç</Button>
        <Button disabled={loading} onClick={save}>
          {loading ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
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

function Section({
  title,
  desc,
  children,
  headerRight,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-charcoal-900">{title}</h2>
          {desc && <p className="mt-1 text-xs text-charcoal-500">{desc}</p>}
        </div>
        {headerRight}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-charcoal-100 bg-sand-50/50 p-3">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          'relative h-6 w-11 rounded-full transition ' +
          (checked ? 'bg-sunset-500' : 'bg-charcoal-300')
        }
        aria-pressed={checked}
      >
        <span
          className={
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ' +
            (checked ? 'left-5' : 'left-0.5')
          }
        />
      </button>
    </label>
  );
}

function LogoUploader({
  target,
  label,
  currentUrl,
  onChange,
  onError,
  onNotice,
  dark,
}: {
  target: 'header' | 'footer';
  label: string;
  currentUrl?: string;
  onChange: (url: string) => void;
  onError: (msg: string) => void;
  onNotice: (msg: string) => void;
  dark?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    const token = adminSession.get();
    if (!token) return;
    setUploading(true);
    try {
      const r = await apiUpload<{ ok: boolean; url: string }>(
        `/admin/settings/logo/${target}`,
        file,
        token,
      );
      onChange(r.url);
      onNotice(`${target === 'header' ? 'Header' : 'Footer'} logosu yüklendi.`);
      setTimeout(() => onNotice(''), 2500);
    } catch (e) {
      onError('Yükleme başarısız: ' + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function clear() {
    if (!confirm('Logoyu kaldırmak istediğinizden emin misiniz?')) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPost(`/admin/settings/logo/${target}/clear`, {}, token);
      onChange('');
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div className="rounded-xl border border-charcoal-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-charcoal-900">{label}</div>
        {currentUrl && (
          <button
            type="button"
            onClick={clear}
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Kaldır
          </button>
        )}
      </div>

      <div
        className={
          'flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-charcoal-200 ' +
          (dark ? 'bg-charcoal-900' : 'bg-sand-50')
        }
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt="Logo önizleme"
            className="max-h-24 max-w-full object-contain"
          />
        ) : (
          <div className={'text-center text-xs ' + (dark ? 'text-charcoal-400' : 'text-charcoal-500')}>
            Logo yok
            <br />
            (mevcut yazı logosu kullanılacak)
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = '';
        }}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-charcoal-500">PNG/JPG/WEBP/SVG · max 2MB</div>
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Yükleniyor…' : currentUrl ? 'Değiştir' : 'Yükle'}
        </Button>
      </div>
    </div>
  );
}
