import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchoolCoords1700000000025 implements MigrationInterface {
  name = 'SchoolCoords1700000000025';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "latitude" double precision`);
    await q.query(`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "longitude" double precision`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "schools" DROP COLUMN IF EXISTS "latitude"`);
    await q.query(`ALTER TABLE "schools" DROP COLUMN IF EXISTS "longitude"`);
  }
}
