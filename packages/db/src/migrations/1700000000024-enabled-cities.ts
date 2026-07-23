import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnabledCities1700000000024 implements MigrationInterface {
  name = 'EnabledCities1700000000024';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "enabled_cities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "city" varchar(80) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "uq_enabled_city" ON "enabled_cities" ("city")`);

    // Seed: Ordu (varsayılan aktif il)
    await q.query(`INSERT INTO "enabled_cities" ("city") VALUES ('Ordu') ON CONFLICT DO NOTHING`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "enabled_cities"`);
  }
}
