import { MigrationInterface, QueryRunner } from 'typeorm';

export class ParentPasswordReviews1700000000004 implements MigrationInterface {
  name = 'ParentPasswordReviews1700000000004';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "parents" ADD COLUMN "password_hash" varchar(200)`);

    await q.query(`
      CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "parent_id" uuid NOT NULL REFERENCES "parents"("id") ON DELETE CASCADE,
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "offer_id" uuid NOT NULL UNIQUE REFERENCES "offers"("id") ON DELETE CASCADE,
        "rating" int NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "comment" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "IDX_reviews_provider" ON "reviews" ("provider_id")`);
    await q.query(`CREATE INDEX "IDX_reviews_parent" ON "reviews" ("parent_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "reviews"`);
    await q.query(`ALTER TABLE "parents" DROP COLUMN "password_hash"`);
  }
}
