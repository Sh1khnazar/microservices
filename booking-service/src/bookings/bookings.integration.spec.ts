/**
 * Concurrent booking integration test — haqiqiy Postgres talab qiladi.
 *
 * Ishga tushirish:
 *   TEST_DATABASE_URL=postgres://booking:booking@localhost:5432/booking_test pnpm test
 *
 * CI'da: ci.yml dagi booking-service job'i Postgres 16 service ko'taradi va
 * TEST_DATABASE_URL env o'zgaruvchisini avtomatik beradi.
 *
 * TEST_DATABASE_URL yo'q bo'lsa butun suite o'tkazib yuboriladi (skip).
 */
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { DataSource } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Booking, BookingStatus } from './entities/booking.entity';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;

// Haqiqiy Postgres kerak — in-memory DB btree_gist/daterange'ni qo'llab-quvvatlamaydi
const describeIf = TEST_DB_URL ? describe : describe.skip;

describeIf('BookingsService — concurrent booking (integration)', () => {
  let dataSource: DataSource;
  let service: BookingsService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: TEST_DB_URL,
      entities: [Booking],
      synchronize: false,
    });
    await dataSource.initialize();

    // Schema + EXCLUDE constraint — har test ishgidan oldin toza holat
    await dataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await dataSource.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await dataSource.query(`DROP TABLE IF EXISTS "bookings"`);
    await dataSource.query(`DROP TYPE IF EXISTS "bookings_status_enum"`);
    await dataSource.query(`
      CREATE TYPE "bookings_status_enum" AS ENUM (
        'PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'
      )
    `);
    await dataSource.query(`
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
    await dataSource.query(
      `CREATE INDEX "IDX_bookings_property_dates"
       ON "bookings" ("propertyId", "startDate", "endDate")`,
    );
    // EXCLUDE constraint — vazifa 1 ning asosi
    await dataSource.query(`
      ALTER TABLE "bookings"
      ADD CONSTRAINT "excl_bookings_property_dates_confirmed"
      EXCLUDE USING gist (
        "propertyId" WITH =,
        daterange("startDate", "endDate", '[)') WITH &&
      ) WHERE (status = 'CONFIRMED')
    `);

    // Property va User client'larini mock qilamiz — faqat DB izchilligi sinaladi
    const mockUserClient = {
      send: jest.fn().mockReturnValue(of({ id: 'u-1', email: 't@t.com', name: 'T' })),
    };
    // propertyClient.send ikki xil pattern'ga javob berishi kerak:
    //   property.findOne       → { id, price, isAvailable }
    //   property.setAvailability → { id, isAvailable } (muvaffaqiyatli)
    const mockPropertyClient = {
      send: jest.fn().mockReturnValue(of({ id: 'p-1', price: 100, isAvailable: true })),
    };

    const module = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: dataSource.getRepository(Booking),
        },
        { provide: DataSource, useValue: dataSource },
        { provide: 'USER_SERVICE', useValue: mockUserClient },
        { provide: 'PROPERTY_SERVICE', useValue: mockPropertyClient },
      ],
    }).compile();

    service = module.get(BookingsService);
  }, 30_000);

  afterEach(async () => {
    // Har test keyin jadvalni tozala
    await dataSource.query(`TRUNCATE TABLE "bookings"`);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('faqat bitta bron o\'tishi kerak — parallel ikki so\'rov bir-birini bloklaydi', async () => {
    const dto = {
      userId: 'u-1',
      propertyId: 'p-1',
      startDate: '2025-09-01',
      endDate: '2025-09-05',
    };

    // Ikki so'rovni bir vaqtda yuboramiz — phantom insert stsenariysini simulatsiya qilamiz
    const [r1, r2] = await Promise.allSettled([
      service.create(dto),
      service.create(dto),
    ]);

    const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
    const rejected = [r1, r2].filter((r) => r.status === 'rejected');

    // Aniq bittasi o'tishi, bittasi rad etilishi kerak
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConflictException,
    );

    // DB'da o'sha oraliq uchun faqat bitta CONFIRMED qator bo'lishi kerak
    const confirmed = await dataSource.getRepository(Booking).find({
      where: { propertyId: 'p-1', status: BookingStatus.CONFIRMED },
    });
    expect(confirmed).toHaveLength(1);
  });

  it('qo\'shni bronlar (A.endDate = B.startDate) ruxsat etilishi kerak', async () => {
    // daterange [) yarim ochiq oraliq: 09-05 kiradi emas → [09-01,09-05) && [09-05,09-10) = false
    const first = await service.create({
      userId: 'u-1',
      propertyId: 'p-1',
      startDate: '2025-09-01',
      endDate: '2025-09-05',
    });
    const second = await service.create({
      userId: 'u-1',
      propertyId: 'p-1',
      startDate: '2025-09-05',
      endDate: '2025-09-10',
    });

    expect(first.status).toBe(BookingStatus.CONFIRMED);
    expect(second.status).toBe(BookingStatus.CONFIRMED);
  });
}, 60_000);
