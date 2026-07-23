import { MigrationInterface, QueryRunner } from 'typeorm';

export class Drivers1700000000017 implements MigrationInterface {
  name = 'Drivers1700000000017';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "drivers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "tc_no" varchar(11),
        "license_class" varchar(10),
        "active" boolean NOT NULL DEFAULT true,
        "note" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_driver_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX "idx_driver_provider" ON "drivers" ("provider_id")`);

    await q.query(`
      CREATE TABLE "driver_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "driver_id" uuid NOT NULL,
        "definition_id" uuid NOT NULL,
        "file_url" varchar(500) NOT NULL,
        "original_name" varchar(200),
        "issued_at" date,
        "expires_at" date,
        "note" text,
        "last_reminder_at" timestamptz,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "rejection_reason" text,
        "reviewed_at" timestamptz,
        "reviewed_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_driver_doc_driver" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_driver_doc_definition" FOREIGN KEY ("definition_id") REFERENCES "document_definitions"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_driver_doc_def" UNIQUE ("driver_id", "definition_id")
      )
    `);
    await q.query(`CREATE INDEX "idx_driver_doc_driver" ON "driver_documents" ("driver_id")`);
    await q.query(`CREATE INDEX "idx_driver_doc_expires" ON "driver_documents" ("expires_at")`);
    await q.query(`CREATE INDEX "idx_driver_doc_status" ON "driver_documents" ("status")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "driver_documents"`);
    await q.query(`DROP TABLE "drivers"`);
  }
}
