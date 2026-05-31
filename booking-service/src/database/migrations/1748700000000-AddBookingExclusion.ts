import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingExclusion1748700000000 implements MigrationInterface {
  name = 'AddBookingExclusion1748700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // btree_gist: TEXT ustunlari uchun GiST operatorlarini ta'minlaydi (= WITH gist)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // EXCLUDE constraint: bitta propertyId uchun CONFIRMED bronlar sana oralig'i kesishmasin.
    // daterange("startDate","endDate",'[)') — yarim ochiq oraliq: startDate kiradi, endDate kirmaydi.
    // Natija: bir bron endDate = keyingi bron startDate bo'lsa — ular qo'shni, kesishmas → ruxsat.
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD CONSTRAINT "excl_bookings_property_dates_confirmed"
      EXCLUDE USING gist (
        "propertyId" WITH =,
        daterange("startDate", "endDate", '[)') WITH &&
      ) WHERE (status = 'CONFIRMED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "excl_bookings_property_dates_confirmed"`,
    );
    // Extension'ni faqat shu migration qo'shgan bo'lsa o'chir; boshqa joylarda kerak bo'lishi mumkin
    await queryRunner.query(`DROP EXTENSION IF EXISTS btree_gist`);
  }
}
