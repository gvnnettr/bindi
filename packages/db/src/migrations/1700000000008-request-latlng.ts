import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequestLatLng1700000000008 implements MigrationInterface {
  name = 'RequestLatLng1700000000008';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "service_requests" ADD COLUMN "latitude" double precision`,
    );
    await q.query(
      `ALTER TABLE "service_requests" ADD COLUMN "longitude" double precision`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "service_requests" DROP COLUMN "latitude"`);
    await q.query(`ALTER TABLE "service_requests" DROP COLUMN "longitude"`);
  }
}
