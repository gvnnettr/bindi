import { MigrationInterface, QueryRunner } from 'typeorm';

export class VehicleDocuments1700000000012 implements MigrationInterface {
  name = 'VehicleDocuments1700000000012';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "vehicle_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "vehicle_id" uuid NOT NULL,
        "type" varchar(40) NOT NULL,
        "file_url" varchar(500) NOT NULL,
        "original_name" varchar(200),
        "issued_at" date,
        "expires_at" date,
        "note" text,
        "last_reminder_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_vehicle_documents_vehicle"
          FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE
      )
    `);
    await q.query(
      `CREATE INDEX "idx_vehicle_documents_vehicle" ON "vehicle_documents" ("vehicle_id")`,
    );
    await q.query(
      `CREATE INDEX "idx_vehicle_documents_expires" ON "vehicle_documents" ("expires_at")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "vehicle_documents"`);
  }
}
