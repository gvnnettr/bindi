import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegionLocation1700000000011 implements MigrationInterface {
  name = 'RegionLocation1700000000011';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "provider_regions" ADD COLUMN "latitude" double precision`,
    );
    await q.query(
      `ALTER TABLE "provider_regions" ADD COLUMN "longitude" double precision`,
    );
    await q.query(
      `ALTER TABLE "provider_regions" ADD COLUMN "radius_km" int`,
    );
    await q.query(
      `ALTER TABLE "provider_regions" ADD COLUMN "label" varchar(200)`,
    );
    // Mevcut unique index (provider,city,district,neighborhood) yeterli kalır;
    // lokasyon bazlı row'lar city/district='*' ile kaydedilebilir.
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "provider_regions" DROP COLUMN "label"`);
    await q.query(`ALTER TABLE "provider_regions" DROP COLUMN "radius_km"`);
    await q.query(`ALTER TABLE "provider_regions" DROP COLUMN "longitude"`);
    await q.query(`ALTER TABLE "provider_regions" DROP COLUMN "latitude"`);
  }
}
