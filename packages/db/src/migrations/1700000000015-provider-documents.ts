import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderDocuments1700000000015 implements MigrationInterface {
  name = 'ProviderDocuments1700000000015';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "provider_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL,
        "definition_id" uuid NOT NULL,
        "file_url" varchar(500) NOT NULL,
        "original_name" varchar(200),
        "issued_at" date,
        "expires_at" date,
        "note" text,
        "last_reminder_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_provider_doc_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_provider_doc_definition" FOREIGN KEY ("definition_id") REFERENCES "document_definitions"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_provider_doc_def" UNIQUE ("provider_id", "definition_id")
      )
    `);
    await q.query(
      `CREATE INDEX "idx_provider_doc_provider" ON "provider_documents" ("provider_id")`,
    );
    await q.query(
      `CREATE INDEX "idx_provider_doc_expires" ON "provider_documents" ("expires_at")`,
    );
    // Password'ü nullable yap — ön kayıt akışı için (şifre onay sonrası set edilir)
    await q.query(
      `ALTER TABLE "providers" ALTER COLUMN "password_hash" DROP NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "provider_documents"`);
  }
}
