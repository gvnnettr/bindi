import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderDocReview1700000000016 implements MigrationInterface {
  name = 'ProviderDocReview1700000000016';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "provider_documents" ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'pending'`,
    );
    await q.query(
      `ALTER TABLE "provider_documents" ADD COLUMN "rejection_reason" text`,
    );
    await q.query(
      `ALTER TABLE "provider_documents" ADD COLUMN "reviewed_at" timestamptz`,
    );
    await q.query(
      `ALTER TABLE "provider_documents" ADD COLUMN "reviewed_by" uuid`,
    );
    await q.query(
      `CREATE INDEX "idx_provider_doc_status" ON "provider_documents" ("status")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "idx_provider_doc_status"`);
    await q.query(`ALTER TABLE "provider_documents" DROP COLUMN "reviewed_by"`);
    await q.query(`ALTER TABLE "provider_documents" DROP COLUMN "reviewed_at"`);
    await q.query(
      `ALTER TABLE "provider_documents" DROP COLUMN "rejection_reason"`,
    );
    await q.query(`ALTER TABLE "provider_documents" DROP COLUMN "status"`);
  }
}
