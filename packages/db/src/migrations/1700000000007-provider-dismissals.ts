import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderDismissals1700000000007 implements MigrationInterface {
  name = 'ProviderDismissals1700000000007';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "provider_dismissals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "request_id" uuid NOT NULL REFERENCES "service_requests"("id") ON DELETE CASCADE,
        "dismissed_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX "IDX_pd_provider_request" ON "provider_dismissals" ("provider_id","request_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "provider_dismissals"`);
  }
}
