import { MigrationInterface, QueryRunner } from 'typeorm';

const LEGACY_MAP: Record<string, string> = {
  ruhsat: 'vehicle_ruhsat',
  muayene: 'vehicle_muayene',
  sigorta: 'vehicle_trafik_sigortasi',
  k_belgesi: 'vehicle_k_belgesi',
};

export class VehicleDocDefinition1700000000018 implements MigrationInterface {
  name = 'VehicleDocDefinition1700000000018';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "vehicle_documents" ADD COLUMN "definition_id" uuid`,
    );
    await q.query(
      `ALTER TABLE "vehicle_documents" ALTER COLUMN "type" DROP NOT NULL`,
    );
    await q.query(
      `ALTER TABLE "vehicle_documents" ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'pending'`,
    );
    await q.query(
      `ALTER TABLE "vehicle_documents" ADD COLUMN "rejection_reason" text`,
    );
    await q.query(
      `ALTER TABLE "vehicle_documents" ADD COLUMN "reviewed_at" timestamptz`,
    );
    await q.query(
      `ALTER TABLE "vehicle_documents" ADD COLUMN "reviewed_by" uuid`,
    );
    await q.query(
      `ALTER TABLE "vehicle_documents" ADD CONSTRAINT "fk_vehicle_doc_definition" FOREIGN KEY ("definition_id") REFERENCES "document_definitions"("id") ON DELETE SET NULL`,
    );
    await q.query(
      `CREATE INDEX "idx_vehicle_doc_definition" ON "vehicle_documents" ("definition_id")`,
    );
    await q.query(
      `CREATE INDEX "idx_vehicle_doc_status" ON "vehicle_documents" ("status")`,
    );

    // Eski enum tipini definition ID'ye map et (varsa)
    for (const [legacyType, code] of Object.entries(LEGACY_MAP)) {
      const rows = await q.query(
        `SELECT id FROM "document_definitions" WHERE code = $1 LIMIT 1`,
        [code],
      );
      if (rows.length > 0) {
        await q.query(
          `UPDATE "vehicle_documents" SET "definition_id" = $1 WHERE "type" = $2 AND "definition_id" IS NULL`,
          [rows[0].id, legacyType],
        );
      }
    }
    // Migrate edilen belgeleri approved işaretle (halihazırda kullanımdaydılar)
    await q.query(
      `UPDATE "vehicle_documents" SET "status" = 'approved' WHERE "definition_id" IS NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "idx_vehicle_doc_status"`);
    await q.query(`DROP INDEX "idx_vehicle_doc_definition"`);
    await q.query(
      `ALTER TABLE "vehicle_documents" DROP CONSTRAINT "fk_vehicle_doc_definition"`,
    );
    await q.query(`ALTER TABLE "vehicle_documents" DROP COLUMN "reviewed_by"`);
    await q.query(`ALTER TABLE "vehicle_documents" DROP COLUMN "reviewed_at"`);
    await q.query(`ALTER TABLE "vehicle_documents" DROP COLUMN "rejection_reason"`);
    await q.query(`ALTER TABLE "vehicle_documents" DROP COLUMN "status"`);
    await q.query(`ALTER TABLE "vehicle_documents" DROP COLUMN "definition_id"`);
  }
}
