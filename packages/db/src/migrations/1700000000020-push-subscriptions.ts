import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushSubscriptions1700000000020 implements MigrationInterface {
  name = 'PushSubscriptions1700000000020';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "role" varchar(20) NOT NULL,
        "recipient_id" uuid,
        "endpoint" text NOT NULL,
        "p256dh" varchar(200) NOT NULL,
        "auth" varchar(100) NOT NULL,
        "user_agent" varchar(300),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(
      `CREATE INDEX "idx_push_role_recipient" ON "push_subscriptions" ("role", "recipient_id")`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "uq_push_endpoint" ON "push_subscriptions" ("endpoint")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "push_subscriptions"`);
  }
}
