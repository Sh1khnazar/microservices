import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of, throwError } from 'rxjs';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking, BookingStatus } from './entities/booking.entity';

const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test' };
const mockProperty = {
  id: 'prop-1',
  title: 'Test',
  price: 100,
  isAvailable: true,
};

const makeBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: 'booking-1',
    userId: 'user-1',
    propertyId: 'prop-1',
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-07-05'),
    totalPrice: 400,
    status: BookingStatus.CONFIRMED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Booking;

const makeDto = (overrides: Partial<CreateBookingDto> = {}): CreateBookingDto => ({
  userId: 'user-1',
  propertyId: 'prop-1',
  startDate: '2025-07-01',
  endDate: '2025-07-05',
  ...overrides,
});

describe('BookingsService', () => {
  let service: BookingsService;

  const mockRepo = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  const mockUserClient = { send: jest.fn() };
  const mockPropertyClient = { send: jest.fn() };

  const mockQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  } as unknown as SelectQueryBuilder<Booking>;

  const mockEntityManager = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (em: unknown) => Promise<unknown>) =>
      cb(mockEntityManager),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: 'USER_SERVICE', useValue: mockUserClient },
        { provide: 'PROPERTY_SERVICE', useValue: mockPropertyClient },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });

  // ─── create() ───────────────────────────────────────────────────

  describe('create()', () => {
    it('should create a confirmed booking when property is free', async () => {
      const dto = makeDto();
      const saved = makeBooking();

      mockUserClient.send.mockReturnValue(of(mockUser));
      mockPropertyClient.send
        .mockReturnValueOnce(of(mockProperty))
        .mockReturnValueOnce(of({ ...mockProperty, isAvailable: false }));

      (mockQb.getOne as jest.Mock).mockResolvedValue(null);
      mockEntityManager.create.mockReturnValue(saved);
      mockEntityManager.save.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(result.totalPrice).toBe(400);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserClient.send.mockReturnValue(throwError(() => new Error('not found')));
      mockPropertyClient.send.mockReturnValue(of(mockProperty));

      await expect(service.create(makeDto())).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when property does not exist', async () => {
      mockUserClient.send.mockReturnValue(of(mockUser));
      mockPropertyClient.send.mockReturnValue(throwError(() => new Error('not found')));

      await expect(service.create(makeDto())).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when endDate <= startDate', async () => {
      mockUserClient.send.mockReturnValue(of(mockUser));
      mockPropertyClient.send.mockReturnValue(of(mockProperty));

      const dto = makeDto({ startDate: '2025-07-05', endDate: '2025-07-01' });
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when date range overlaps existing CONFIRMED booking', async () => {
      mockUserClient.send.mockReturnValue(of(mockUser));
      mockPropertyClient.send.mockReturnValue(of(mockProperty));

      (mockQb.getOne as jest.Mock).mockResolvedValue(makeBooking());

      await expect(service.create(makeDto())).rejects.toThrow(ConflictException);
    });

    it('should apply compensating action (FAILED) when setAvailability fails', async () => {
      const dto = makeDto();
      const saved = makeBooking();

      mockUserClient.send.mockReturnValue(of(mockUser));
      mockPropertyClient.send
        .mockReturnValueOnce(of(mockProperty))
        .mockReturnValueOnce(throwError(() => new Error('network error')));

      (mockQb.getOne as jest.Mock).mockResolvedValue(null);
      mockEntityManager.create.mockReturnValue(saved);
      mockEntityManager.save.mockResolvedValue(saved);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      await expect(service.create(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockRepo.update).toHaveBeenCalledWith(saved.id, {
        status: BookingStatus.FAILED,
      });
    });
  });

  // ─── cancel() ───────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should cancel a confirmed booking and free the property', async () => {
      const booking = makeBooking();
      mockRepo.findOneBy.mockResolvedValue(booking);
      mockRepo.save.mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED });
      mockPropertyClient.send.mockReturnValue(of({ ...mockProperty, isAvailable: true }));

      const result = await service.cancel('booking-1');

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should throw BadRequestException when booking is already cancelled', async () => {
      mockRepo.findOneBy.mockResolvedValue(
        makeBooking({ status: BookingStatus.CANCELLED }),
      );

      await expect(service.cancel('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('should restore booking to CONFIRMED if setAvailability fails during cancel', async () => {
      const booking = makeBooking();
      mockRepo.findOneBy.mockResolvedValue(booking);
      mockRepo.save.mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED });
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockPropertyClient.send.mockReturnValue(
        throwError(() => new Error('service down')),
      );

      await expect(service.cancel('booking-1')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockRepo.update).toHaveBeenCalledWith('booking-1', {
        status: BookingStatus.CONFIRMED,
      });
    });
  });

  // ─── findOne() ──────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return booking when found', async () => {
      const booking = makeBooking();
      mockRepo.findOneBy.mockResolvedValue(booking);
      const result = await service.findOne('booking-1');
      expect(result.id).toBe('booking-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
