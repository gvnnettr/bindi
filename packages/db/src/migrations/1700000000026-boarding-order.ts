import { MigrationInterface, QueryRunner } from 'typeorm';

export class BoardingOrder1700000000026 implements MigrationInterface {
  name = 'BoardingOrder1700000000026';

  public async up(q: QueryRunner): Promise<void> {
    // Enrollment icinde arac icindeki sira (route order)
    await q.query(`ALTER TABLE "enrollments" ADD COLUMN IF NOT EXISTS "order_no" integer`);
    // TripEnrollment icinde bindi zamani ve durumu
    await q.query(`ALTER TABLE "trip_enrollments" ADD COLUMN IF NOT EXISTS "boarded_at" timestamptz`);
    await q.query(`ALTER TABLE "trip_enrollments" ADD COLUMN IF NOT EXISTS "board_status" varchar(20) NOT NULL DEFAULT 'pending'`);
    // pending | boarded | missed
    await q.query(`CREATE INDEX IF NOT EXISTS "idx_enrollments_vehicle_order" ON "enrollments" ("vehicle_id", "order_no")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "idx_enrollments_vehicle_order"`);
    await q.query(`ALTER TABLE "trip_enrollments" DROP COLUMN IF EXISTS "board_status"`);
    await q.query(`ALTER TABLE "trip_enrollments" DROP COLUMN IF EXISTS "boarded_at"`);
    await q.query(`ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "order_no"`);
  }
}
