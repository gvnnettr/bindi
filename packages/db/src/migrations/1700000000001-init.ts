import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000001 implements MigrationInterface {
  name = 'Init1700000000001';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await q.query(`
      CREATE TABLE "parents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "phone" varchar(20) NOT NULL,
        "name" varchar(120) NOT NULL,
        "email" varchar(160),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "IDX_parents_phone" ON "parents" ("phone")`);

    await q.query(`
      CREATE TABLE "schools" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "city" varchar(80) NOT NULL,
        "district" varchar(80) NOT NULL,
        "address" varchar(300),
        "active" boolean NOT NULL DEFAULT true
      )
    `);
    await q.query(`CREATE INDEX "IDX_schools_city_district" ON "schools" ("city","district")`);

    await q.query(`
      CREATE TABLE "students" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "parent_id" uuid NOT NULL REFERENCES "parents"("id") ON DELETE CASCADE,
        "name" varchar(120) NOT NULL,
        "class" varchar(40),
        "school_id" uuid REFERENCES "schools"("id")
      )
    `);

    await q.query(`
      CREATE TABLE "regions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "city" varchar(80) NOT NULL,
        "district" varchar(80) NOT NULL,
        "neighborhood" varchar(120) NOT NULL
      )
    `);
    await q.query(`CREATE INDEX "IDX_regions_city_district" ON "regions" ("city","district")`);

    await q.query(`
      CREATE TABLE "service_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "parent_id" uuid NOT NULL REFERENCES "parents"("id") ON DELETE CASCADE,
        "status" varchar(20) NOT NULL DEFAULT 'open',
        "pickupType" varchar(20) NOT NULL DEFAULT 'both',
        "city" varchar(80) NOT NULL,
        "district" varchar(80) NOT NULL,
        "neighborhood" varchar(120) NOT NULL,
        "address" varchar(300) NOT NULL,
        "notes" text,
        "magic_token" varchar(64) NOT NULL,
        "magic_expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "IDX_sr_magic_token" ON "service_requests" ("magic_token")`);

    await q.query(`
      CREATE TABLE "request_students" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL REFERENCES "service_requests"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE
      )
    `);

    await q.query(`
      CREATE TABLE "providers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "phone" varchar(20) NOT NULL,
        "company_name" varchar(200) NOT NULL,
        "tax_no" varchar(20),
        "owner_name" varchar(120) NOT NULL,
        "email" varchar(160),
        "address" varchar(300),
        "status" varchar(20) NOT NULL DEFAULT 'pending_payment',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "IDX_providers_phone" ON "providers" ("phone")`);

    await q.query(`
      CREATE TABLE "provider_schools" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "school_id" uuid NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "IDX_ps_unique" ON "provider_schools" ("provider_id","school_id")`);

    await q.query(`
      CREATE TABLE "provider_regions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "city" varchar(80) NOT NULL,
        "district" varchar(80) NOT NULL,
        "neighborhood" varchar(120) NOT NULL DEFAULT '*'
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "IDX_pr_unique" ON "provider_regions" ("provider_id","city","district","neighborhood")`);

    await q.query(`
      CREATE TABLE "packages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(40) NOT NULL UNIQUE,
        "name" varchar(120) NOT NULL,
        "monthly_price" numeric(12,2) NOT NULL,
        "active" boolean NOT NULL DEFAULT true
      )
    `);

    await q.query(`
      CREATE TABLE "provider_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "package_code" varchar(40) NOT NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "receipt_url" varchar(500),
        "approved_at" timestamptz,
        "approved_by" varchar(200),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "IDX_ps_active" ON "provider_subscriptions" ("provider_id","package_code","ends_at")`);

    await q.query(`
      CREATE TABLE "vehicles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "brand" varchar(80) NOT NULL,
        "model" varchar(120) NOT NULL,
        "year" int NOT NULL,
        "plate" varchar(20) NOT NULL,
        "seats" int NOT NULL,
        "photo_url" varchar(500)
      )
    `);

    await q.query(`
      CREATE TABLE "offers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL REFERENCES "service_requests"("id") ON DELETE CASCADE,
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "vehicle_id" uuid REFERENCES "vehicles"("id"),
        "monthly_price" numeric(12,2) NOT NULL,
        "note" text,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "IDX_offer_unique" ON "offers" ("request_id","provider_id")`);

    await q.query(`
      CREATE TABLE "otp_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "phone" varchar(20) NOT NULL,
        "purpose" varchar(40) NOT NULL,
        "code_hash" varchar(100) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "attempts" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "IDX_otp_phone_purpose" ON "otp_requests" ("phone","purpose")`);

    await q.query(`
      CREATE TABLE "admin_users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(160) NOT NULL,
        "password_hash" varchar(200) NOT NULL,
        "role" varchar(40) NOT NULL DEFAULT 'admin',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "IDX_admin_email" ON "admin_users" ("email")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "admin_users" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "otp_requests" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "offers" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "vehicles" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "provider_subscriptions" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "packages" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "provider_regions" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "provider_schools" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "providers" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "request_students" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "service_requests" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "regions" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "students" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "schools" CASCADE`);
    await q.query(`DROP TABLE IF EXISTS "parents" CASCADE`);
  }
}
