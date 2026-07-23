import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULTS = [
  // Şirket
  { code: 'company_tax_certificate', name: 'Vergi Levhası', scope: 'company', required: true, sort: 10, expiry: true },
  { code: 'company_trade_registry', name: 'Ticaret Sicil Belgesi', scope: 'company', required: true, sort: 20, expiry: false },
  { code: 'company_chamber_registry', name: 'Oda Sicil Kaydı', scope: 'company', required: true, sort: 30, expiry: true },
  { code: 'company_signature_circular', name: 'İmza Sirküleri', scope: 'company', required: false, sort: 40, expiry: false },
  { code: 'company_k_belgesi', name: 'K Yetki Belgesi (Şirket)', scope: 'company', required: true, sort: 50, expiry: true },

  // Araç
  { code: 'vehicle_ruhsat', name: 'Ruhsat (Tescil Belgesi)', scope: 'vehicle', required: true, sort: 10, expiry: false },
  { code: 'vehicle_muayene', name: 'Muayene Raporu', scope: 'vehicle', required: true, sort: 20, expiry: true },
  { code: 'vehicle_trafik_sigortasi', name: 'Zorunlu Trafik Sigortası', scope: 'vehicle', required: true, sort: 30, expiry: true },
  { code: 'vehicle_kasko', name: 'Kasko Sigortası', scope: 'vehicle', required: false, sort: 40, expiry: true },
  { code: 'vehicle_koltuk_ferdi', name: 'Koltuk Ferdi Kaza Sigortası', scope: 'vehicle', required: true, sort: 50, expiry: true },
  { code: 'vehicle_egzoz_emisyon', name: 'Egzoz Emisyon Ölçümü', scope: 'vehicle', required: false, sort: 60, expiry: true },

  // Şoför
  { code: 'driver_ehliyet', name: 'Sürücü Belgesi (Ehliyet)', scope: 'driver', required: true, sort: 10, expiry: true },
  { code: 'driver_src', name: 'SRC Belgesi', scope: 'driver', required: true, sort: 20, expiry: true },
  { code: 'driver_psikoteknik', name: 'Psikoteknik Değerlendirme', scope: 'driver', required: true, sort: 30, expiry: true },
  { code: 'driver_adli_sicil', name: 'Adli Sicil Kaydı', scope: 'driver', required: true, sort: 40, expiry: true },
  { code: 'driver_saglik_raporu', name: 'Sağlık Raporu', scope: 'driver', required: true, sort: 50, expiry: true },
  { code: 'driver_meslek_odasi', name: 'Meslek Odası Kaydı', scope: 'driver', required: false, sort: 60, expiry: true },
];

export class DocumentDefinitions1700000000014 implements MigrationInterface {
  name = 'DocumentDefinitions1700000000014';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "document_definitions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(60) NOT NULL UNIQUE,
        "name" varchar(200) NOT NULL,
        "scope" varchar(20) NOT NULL,
        "required" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "requires_expiry" boolean NOT NULL DEFAULT false,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(
      `CREATE INDEX "idx_docdef_scope" ON "document_definitions" ("scope")`,
    );
    for (const d of DEFAULTS) {
      await q.query(
        `INSERT INTO "document_definitions" ("code","name","scope","required","sort_order","requires_expiry") VALUES ($1,$2,$3,$4,$5,$6)`,
        [d.code, d.name, d.scope, d.required, d.sort, d.expiry],
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "document_definitions"`);
  }
}
