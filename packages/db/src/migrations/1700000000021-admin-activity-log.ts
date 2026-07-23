import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminActivityLog1700000000021 implements MigrationInterface {
  name = 'AdminActivityLog1700000000021';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "admin_activity_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "admin_id" uuid,
        "action" varchar(60) NOT NULL,
        "target_type" varchar(40),
        "target_id" uuid,
        "summary" text,
        "meta" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(
      `CREATE INDEX "idx_activity_created" ON "admin_activity_log" ("created_at" DESC)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "admin_activity_log"`);
  }
}
