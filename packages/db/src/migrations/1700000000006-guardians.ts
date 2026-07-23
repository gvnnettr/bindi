import { MigrationInterface, QueryRunner } from 'typeorm';

export class Guardians1700000000006 implements MigrationInterface {
  name = 'Guardians1700000000006';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "student_guardians" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "parent_id" uuid NOT NULL REFERENCES "parents"("id") ON DELETE CASCADE,
        "relation" varchar(40) NOT NULL DEFAULT 'other',
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX "IDX_sg_student_parent" ON "student_guardians" ("student_id","parent_id")`,
    );
    // Mevcut student.parent_id ilişkilerini primary guardian olarak seed'le
    await q.query(`
      INSERT INTO "student_guardians" ("student_id", "parent_id", "relation", "is_primary")
      SELECT id, parent_id, 'primary', true FROM "students" WHERE parent_id IS NOT NULL
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "student_guardians"`);
  }
}
