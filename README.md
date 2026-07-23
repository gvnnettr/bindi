# Servis Platform (çalışma adı)

Okul servisi teklif marketplace'i. Veliler teklif ister, servisçiler teklif verir, veli seçer.

## Yapı

- `apps/api` — NestJS REST API
- `apps/web` — Next.js (veli / servisçi / admin tek uygulamada segment tabanlı)
- `packages/db` — TypeORM entity + migration
- `packages/shared` — DTO tipleri, sabitler

## Geliştirme

```bash
pnpm install
cp .env.example .env
# .env'i düzenle — Postgres'in olmadıysa Docker ile aç:
docker compose up -d db
# DATABASE_URL=postgres://servis:servis@localhost:5432/servis_platform

pnpm --filter @servis/db exec typeorm-ts-node-commonjs migration:run -d src/data-source.ts
pnpm --filter @servis/db seed
pnpm dev:api   # http://localhost:4001
pnpm dev:web   # http://localhost:3001
```

SMS: `.env`'de `SMS_PROVIDER=stub` bırakırsan kodlar konsola yazılır (Netgsm hesabına gerek yok).

Sunucu deploy'u için: [DEPLOY.md](./DEPLOY.md)

Plan: `/Users/nazlibegum/.claude/plans/zazzy-mapping-forest.md`
