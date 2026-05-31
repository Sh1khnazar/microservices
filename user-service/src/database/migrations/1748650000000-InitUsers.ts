import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitUsers1748650000000 implements MigrationInterface {
  name = 'InitUsers1748650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "email"      CHARACTER VARYING NOT NULL,
        "name"       CHARACTER VARYING NOT NULL,
        "password"   CHARACTER VARYING NOT NULL,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id"    PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
