import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitBookings1748650000000 implements MigrationInterface {
  name = 'InitBookings1748650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "bookings_status_enum" AS ENUM (
        'PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "userId"     CHARACTER VARYING NOT NULL,
        "propertyId" CHARACTER VARYING NOT NULL,
        "startDate"  DATE NOT NULL,
        "endDate"    DATE NOT NULL,
        "totalPrice" NUMERIC(10,2) NOT NULL,
        "status"     "bookings_status_enum" NOT NULL DEFAULT 'PENDING',
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_property_dates" ON "bookings" ("propertyId", "startDate", "endDate")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_bookings_property_dates"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TYPE "bookings_status_enum"`);
  }
}
