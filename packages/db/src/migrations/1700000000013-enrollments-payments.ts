import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnrollmentsPayments1700000000013 implements MigrationInterface {
  name = 'EnrollmentsPayments1700000000013';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "enrollments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL,
        "parent_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "vehicle_id" uuid,
        "offer_id" uuid,
        "monthly_price" numeric(12,2) NOT NULL,
        "start_month" varchar(7) NOT NULL,
        "end_month" varchar(7),
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "note" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_enroll_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_enroll_parent" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_enroll_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_enroll_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_enroll_offer" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL,
        CONSTRAINT "uq_enrollment_offer" UNIQUE ("offer_id")
      )
    `);
    await q.query(`CREATE INDEX "idx_enroll_provider" ON "enrollments" ("provider_id")`);
    await q.query(`CREATE INDEX "idx_enroll_parent" ON "enrollments" ("parent_id")`);
    await q.query(`CREATE INDEX "idx_enroll_status" ON "enrollments" ("status")`);

    await q.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "enrollment_id" uuid NOT NULL,
        "period" varchar(7) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "due_date" date NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "receipt_url" varchar(500),
        "parent_note" text,
        "provider_note" text,
        "submitted_at" timestamptz,
        "paid_at" timestamptz,
        "last_reminder_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payment_enrollment" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_payment_enrollment_period" UNIQUE ("enrollment_id", "period")
      )
    `);
    await q.query(`CREATE INDEX "idx_payment_enrollment" ON "payments" ("enrollment_id")`);
    await q.query(`CREATE INDEX "idx_payment_status" ON "payments" ("status")`);
    await q.query(`CREATE INDEX "idx_payment_due_date" ON "payments" ("due_date")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "payments"`);
    await q.query(`DROP TABLE "enrollments"`);
  }
}
