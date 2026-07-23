import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderMustChangePassword1700000000019
  implements MigrationInterface
{
  name = 'ProviderMustChangePassword1700000000019';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "providers" ADD COLUMN "must_change_password" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "providers" DROP COLUMN "must_change_password"`,
    );
  }
}
