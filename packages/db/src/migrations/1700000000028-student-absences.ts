import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentAbsences1700000000028 implements MigrationInterface {
  name = 'StudentAbsences1700000000028';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "student_absences" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "session" varchar(10) NOT NULL DEFAULT 'both',
        "reason" text,
        "created_by_parent_id" uuid REFERENCES "parents"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_student_absence_unique" UNIQUE ("student_id", "date", "session")
      )
    `);
    await q.query(`
      CREATE INDEX IF NOT EXISTS "idx_student_absences_student_date"
        ON "student_absences" ("student_id", "date")
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "student_absences"`);
  }
}
