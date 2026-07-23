'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';

type Mode = 'all-parents' | 'all-providers' | 'single-parent' | 'single-provider';

interface UserOption {
  id: string;
  label: string;
}

export default function AdminBroadcastPage() {
  const [mode, setMode] = useState<Mode>('all-parents');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const single = mode === 'single-parent' || mode === 'single-provider';
  const role: 'parent' | 'provider' =
    mode === 'all-parents' || mode === 'single-parent' ? 'parent' : 'provider';

  useEffect(() => {
    if (!single || q.length < 2) {
      setUsers([]);
      return;
    }
    const token = adminSession.get();
    if (!token) return;
    const timer = setTimeout(async () => {
      try {
        const data = await apiGet<UserOption[]>(
          `/admin/search-users?role=${role}&q=${encodeURIComponent(q)}`,
          token,
        );
        setUsers(data);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [q, single, role]);

  async function send() {
    const token = adminSession.get();
    if (!token || !title) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const r = await apiPost<{ count: number }>(
        '/admin/broadcast',
        {
          role,
          recipientId: single ? selectedUserId : null,
          title,
          body: body || undefined,
          link: link || undefined,
        },
        token,
      );
      setNotice(`${r.count} kişiye bildirim gönderildi.`);
      setTitle('');
      setBody('');
      setLink('');
      setQ('');
      setSelectedUserId('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-900">
          Bildirim Gönder
        </h1>
        <p className="mt-1 text-sm text-charcoal-600">
          Veli veya servisçilere toplu ya da tekil bildirim gönderin.
        </p>
      </div>

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

      <div className="card space-y-4 p-6">
        <Field label="Hedef">
          <Select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="all-parents">Tüm Veliler</option>
            <option value="all-providers">Tüm Servisçiler</option>
            <option value="single-parent">Tek Veli</option>
            <option value="single-provider">Tek Servisçi</option>
          </Select>
        </Field>

        {single && (
          <Field label="Kullanıcı Ara" hint="En az 2 karakter (isim veya telefon)">
            <Input value={q} onChange={(e) => setQ(e.target.value)} />
            {users.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-charcoal-100 bg-white">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setQ(u.label);
                      setUsers([]);
                    }}
                    className={
                      'block w-full px-3 py-2 text-left text-sm ' +
                      (selectedUserId === u.id
                        ? 'bg-sunset-50 text-sunset-700'
                        : 'hover:bg-sand-50 text-charcoal-800')
                    }
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}

        <Field label="Başlık">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label="Mesaj (opsiyonel)">
          <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>

        <Field label="Bağlantı (opsiyonel)" hint="Örn: /veli veya /servisci/talepler">
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/..." />
        </Field>

        <Button
          disabled={loading || !title || (single && !selectedUserId)}
          onClick={send}
        >
          Gönder
        </Button>
      </div>
    </div>
  );
}
