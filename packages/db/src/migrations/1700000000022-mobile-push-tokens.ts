import { MigrationInterface, QueryRunner } from 'typeorm';

export class MobilePushTokens1700000000022 implements MigrationInterface {
  name = 'MobilePushTokens1700000000022';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "mobile_push_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "role" varchar(20) NOT NULL,
        "recipient_id" uuid,
        "token" text NOT NULL,
        "platform" varchar(10) NOT NULL,
        "device_id" varchar(200),
        "app_version" varchar(40),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(
      `CREATE INDEX "idx_mpt_role_recipient" ON "mobile_push_tokens" ("role", "recipient_id")`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "uq_mpt_token" ON "mobile_push_tokens" ("token")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "mobile_push_tokens"`);
  }
}
