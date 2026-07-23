import { MigrationInterface, QueryRunner } from 'typeorm';

export class Notifications1700000000009 implements MigrationInterface {
  name = 'Notifications1700000000009';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipient_role" varchar(20) NOT NULL,
        "recipient_id" uuid,
        "type" varchar(60) NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" text,
        "link" varchar(300),
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(
      `CREATE INDEX "IDX_notif_recipient_created" ON "notifications" ("recipient_role","recipient_id","created_at" DESC)`,
    );
    await q.query(
      `CREATE INDEX "IDX_notif_unread" ON "notifications" ("recipient_role","recipient_id","read_at")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
