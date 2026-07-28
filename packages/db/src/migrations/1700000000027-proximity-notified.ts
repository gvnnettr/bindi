import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProximityNotified1700000000027 implements MigrationInterface {
  name = 'ProximityNotified1700000000027';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "trip_enrollments" ADD COLUMN IF NOT EXISTS "proximity_notified_at" timestamptz`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "trip_enrollments" DROP COLUMN IF EXISTS "proximity_notified_at"`);
  }
}
