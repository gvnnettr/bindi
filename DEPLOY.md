# Deploy — 146.19.208.88

Yeni Ubuntu sunucumuz (native nginx, Plesk-less). Proje şu isim altında bir subdomain'de yayına alınacak (ör. `servis.example.com`, domain sonra belirlenir).

## 1. Postgres 15'te DB + kullanıcı

Sunucuda mevcut Postgres 15 kurulumu varsayılıyor.

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE servis_platform;
CREATE USER servis WITH ENCRYPTED PASSWORD '<GÜÇLÜ_ŞİFRE>';
GRANT ALL PRIVILEGES ON DATABASE servis_platform TO servis;
\c servis_platform
GRANT ALL ON SCHEMA public TO servis;
SQL
```

## 2. Kodu sunucuya al

```bash
sudo mkdir -p /var/www/servis-platform
sudo chown $USER:$USER /var/www/servis-platform
cd /var/www
git clone <repo-url> servis-platform    # ya da rsync -avz local'den
cd servis-platform
```

## 3. `.env` yaz

`.env.example`'ı kopyala ve gerçek değerleri koy:

```bash
cp .env.example .env
nano .env
```

**Doldurulması gerekenler**:
- `DATABASE_URL=postgres://servis:<ŞİFRE>@localhost:5432/servis_platform`
- `JWT_SECRET=<openssl rand -hex 32>`
- `MAGIC_LINK_SECRET=<openssl rand -hex 32>`
- `NETGSM_USER`, `NETGSM_PASS`, `NETGSM_HEADER` (Netgsm hesabı bilgileri)
- `SMS_PROVIDER=netgsm`
- `NEXT_PUBLIC_API_URL=https://<domain>` (front-end kullanacak, API_URL ile web_url aynı domain, farklı path'ler)
- `WEB_BASE_URL=https://<domain>`
- `ADMIN_EMAIL` + `ADMIN_PASSWORD` (ilk admin kullanıcısı için)

## 4. Kur, migrate, seed

```bash
# Node 20+ olmalı — nvm/asdf ile ayarla
pnpm install --frozen-lockfile
pnpm --filter @servis/db exec typeorm-ts-node-commonjs migration:run -d src/data-source.ts
pnpm --filter @servis/db exec ts-node src/seed.ts
pnpm build
```

Seed script:
- `packages` tablosuna `teklif` (250 ₺) ve `takip` (450 ₺) paketlerini ekler (fiyatları admin panelden değiştirebilirsiniz).
- `.env`'deki `ADMIN_EMAIL`/`ADMIN_PASSWORD` ile ilk admin'i oluşturur.

## 5. PM2 servisleri

```bash
npm i -g pm2

# API
pm2 start apps/api/dist/main.js --name servis-api --cwd /var/www/servis-platform

# Web
pm2 start "pnpm --filter @servis/web start" --name servis-web --cwd /var/www/servis-platform

pm2 save
pm2 startup   # çıktıdaki komutu sudo ile çalıştır
```

## 6. Nginx

`/etc/nginx/sites-available/servis-platform` (subdomain'i güncelle):

```nginx
server {
    listen 80;
    server_name <domain>;

    location /api/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/servis-platform /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d <domain>
```

## 7. Verification

- `https://<domain>/` — anasayfa açılmalı
- `/teklif-al` — telefon doğrulama SMS'i Netgsm'den gelmeli
- `/admin/giris` — `.env`'de tanımladığın admin bilgileriyle gir
- `/admin/okullar` — birkaç okul ekle (sistem boş başlar)
- `/servisci/kayit` — test servisçi kaydı yap, `/admin/servisciler`'den onayla, `/servisci/giris` ile gir

## 8. Güncelleme

```bash
cd /var/www/servis-platform
git pull
pnpm install --frozen-lockfile
pnpm --filter @servis/db exec typeorm-ts-node-commonjs migration:run -d src/data-source.ts
pnpm build
pm2 reload servis-api
pm2 reload servis-web
```

## Notlar

- Netgsm SMS başlığı (`NETGSM_HEADER`) izinli olmalı — ilk defa kullanıyorsanız Netgsm'den onaylatın.
- `SMS_PROVIDER=stub` bırakırsanız SMS'ler console'a yazılır (sadece geliştirme için).
- Faz 2 (öğrenci/veli/ödeme takibi) MVP dışında bırakıldı; `provider_subscriptions` tablosunda `takip` paketi alanı mevcut, aktivasyon Faz 2 ile birlikte açılacak.
