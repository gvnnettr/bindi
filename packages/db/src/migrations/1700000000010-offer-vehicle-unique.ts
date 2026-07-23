import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfferVehicleUnique1700000000010 implements MigrationInterface {
  name = 'OfferVehicleUnique1700000000010';

  public async up(q: QueryRunner): Promise<void> {
    // Eski (request_id, provider_id) unique kaldır
    await q.query(`DROP INDEX IF EXISTS "IDX_offer_unique"`);
    // Yeni: (request_id, provider_id, vehicle_id) — NULL vehicle_id de tekildir (Postgres NULLS NOT DISTINCT)
    await q.query(
      `CREATE UNIQUE INDEX "IDX_offer_unique_v" ON "offers" ("request_id","provider_id","vehicle_id") NULLS NOT DISTINCT`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_offer_unique_v"`);
    await q.query(
      `CREATE UNIQUE INDEX "IDX_offer_unique" ON "offers" ("request_id","provider_id")`,
    );
  }
}
