import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitProperties1748650000000 implements MigrationInterface {
  name = 'InitProperties1748650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "properties" (
        "id"          UUID    NOT NULL DEFAULT uuid_generate_v4(),
        "title"       CHARACTER VARYING NOT NULL,
        "description" TEXT,
        "price"       NUMERIC(10,2) NOT NULL,
        "address"     CHARACTER VARYING NOT NULL,
        "city"        CHARACTER VARYING NOT NULL,
        "ownerId"     CHARACTER VARYING NOT NULL,
        "isAvailable" BOOLEAN NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_properties_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "properties"`);
  }
}
