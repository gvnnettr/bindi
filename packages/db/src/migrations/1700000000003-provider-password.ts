import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderPassword1700000000003 implements MigrationInterface {
  name = 'ProviderPassword1700000000003';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "providers" ADD COLUMN "password_hash" varchar(200)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "providers" DROP COLUMN "password_hash"`);
  }
}
