'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button } from '@/components/ui';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    try {
      const rows = await apiGet<AdminUser[]>('/admin/users', token);
      setUsers(rows);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string, email: string) {
    if (!confirm(`${email} adlı yönetici silinsin mi?`)) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiDelete(`/admin/users/${id}`, token);
      setNotice('Yönetici silindi.');
      setTimeout(() => setNotice(null), 2500);
      await load();
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-charcoal-900">Yönetici Kullanıcılar</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Admin paneline erişebilen kullanıcılar. Sadece adminler ekleyebilir.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Yeni Yönetici</Button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-6 py-3">E-posta</th>
              <th className="px-6 py-3">Rol</th>
              <th className="px-6 py-3">Oluşturma</th>
              <th className="px-6 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-sand-50/50">
                <td className="px-6 py-4 font-semibold text-charcoal-900">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="badge-info">{u.role}</span>
                </td>
                <td className="px-6 py-4 text-charcoal-500">
                  {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex gap-3">
                    <button
                      onClick={() => setEditingId(u.id)}
                      className="text-sm font-semibold text-sunset-600 hover:text-sunset-700"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => remove(u.id, u.email)}
                      className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-16 text-center text-sm text-charcoal-500">
                  Yönetici yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            setNotice('Yeni yönetici eklendi.');
            setTimeout(() => setNotice(null), 2500);
            load();
          }}
          onError={setError}
        />
      )}

      {editingId && (
        <EditModal
          user={users.find((u) => u.id === editingId)!}
          onClose={() => setEditingId(null)}
          onSuccess={() => {
            setEditingId(null);
            setNotice('Yönetici güncellendi.');
            setTimeout(() => setNotice(null), 2500);
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function CreateModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPost('/admin/users', { email, password, role }, token);
      onSuccess();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni Yönetici" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-posta" required>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
          />
        </Field>
        <Field label="Şifre (en az 6 karakter)" required>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
          />
        </Field>
        <Field label="Rol">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
          >
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            İptal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Ekleniyor…' : 'Ekle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({
  user,
  onClose,
  onSuccess,
  onError,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = adminSession.get();
    if (!token) return;
    const payload: Record<string, string> = { email, role };
    if (password) payload.password = password;
    try {
      await apiPatch(`/admin/users/${user.id}`, payload, token);
      onSuccess();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Düzenle: ${user.email}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-posta" required>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
          />
        </Field>
        <Field label="Yeni Şifre" hint="Boş bırakırsanız mevcut şifre korunur.">
          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
          />
        </Field>
        <Field label="Rol">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
          >
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            İptal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card-hover">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-charcoal-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1 text-charcoal-500 hover:bg-sand-50 hover:text-charcoal-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <div className="mt-1 text-[11px] text-charcoal-500">{hint}</div>}
    </div>
  );
}
