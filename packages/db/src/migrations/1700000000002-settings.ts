import { MigrationInterface, QueryRunner } from 'typeorm';

export class Settings1700000000002 implements MigrationInterface {
  name = 'Settings1700000000002';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(80) NOT NULL UNIQUE,
        "value" text,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "IDX_settings_key" ON "settings" ("key")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "settings"`);
  }
}
