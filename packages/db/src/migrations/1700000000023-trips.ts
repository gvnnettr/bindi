import { MigrationInterface, QueryRunner } from 'typeorm';

export class Trips1700000000023 implements MigrationInterface {
  name = 'Trips1700000000023';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "trips" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "vehicle_id" uuid REFERENCES "vehicles"("id") ON DELETE SET NULL,
        "route_name" varchar(120),
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "current_lat" numeric(10,7),
        "current_lng" numeric(10,7),
        "location_updated_at" timestamptz,
        "started_at" timestamptz NOT NULL,
        "ended_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "idx_trips_provider_status" ON "trips" ("provider_id", "status")`);

    await q.query(`
      CREATE TABLE "trip_enrollments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
        "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE("trip_id", "enrollment_id")
      )
    `);
    await q.query(`CREATE INDEX "idx_trip_enrollments_trip" ON "trip_enrollments" ("trip_id")`);
    await q.query(`CREATE INDEX "idx_trip_enrollments_enrollment" ON "trip_enrollments" ("enrollment_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "trip_enrollments"`);
    await q.query(`DROP TABLE "trips"`);
  }
}
