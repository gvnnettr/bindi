import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfferSelectedAt1700000000005 implements MigrationInterface {
  name = 'OfferSelectedAt1700000000005';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "offers" ADD COLUMN "selected_at" timestamptz`);
    // Mevcut selected offer'lar için created_at yaklaşımı
    await q.query(
      `UPDATE "offers" SET "selected_at" = "created_at" WHERE status = 'selected' AND "selected_at" IS NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "offers" DROP COLUMN "selected_at"`);
  }
}
