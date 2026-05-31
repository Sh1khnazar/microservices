import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking, BookingStatus } from './entities/booking.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    private readonly dataSource: DataSource,

    @Inject('USER_SERVICE')
    private readonly userClient: ClientProxy,

    @Inject('PROPERTY_SERVICE')
    private readonly propertyClient: ClientProxy,
  ) {}

  async create(dto: CreateBookingDto) {
    // 1. User va property mavjudligini tekshir (tranzaksiyadan tashqarida — tez fail)
    const user = await firstValueFrom(
      this.userClient.send('user.findOne', { id: dto.userId }),
    ).catch(() => null);
    if (!user) throw new NotFoundException('User topilmadi');

    const property = await firstValueFrom(
      this.propertyClient.send('property.findOne', { id: dto.propertyId }),
    ).catch(() => null);
    if (!property) throw new NotFoundException('Property topilmadi');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException(
        "endDate startDate dan keyin bo'lishi kerak",
      );
    }
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
    const totalPrice = days * Number(property.price);

    // 2. Tranzaksiya ichida race condition'dan himoyalangan overlap tekshir + saqlash
    const booking = await this.dataSource.transaction(async (manager) => {
      // Pessimistic write lock: bir vaqtda bir so'rov ishlaydi
      const conflict = await manager
        .createQueryBuilder(Booking, 'b')
        .where('b.propertyId = :propertyId', { propertyId: dto.propertyId })
        .andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED],
        })
        // [startDate, endDate) oralig'i kesishuvini tekshir
        .andWhere('b.startDate < :endDate', { endDate: dto.endDate })
        .andWhere('b.endDate > :startDate', { startDate: dto.startDate })
        .setLock('pessimistic_write')
        .getOne();

      if (conflict) {
        throw new ConflictException(
          `Property ${dto.propertyId} bu sanalar uchun allaqachon band`,
        );
      }

      const newBooking = manager.create(Booking, {
        ...dto,
        totalPrice,
        status: BookingStatus.CONFIRMED,
      });
      try {
        return await manager.save(newBooking);
      } catch (err: unknown) {
        // 23P01 = exclusion_violation: EXCLUDE constraint (btree_gist) buzilib qoldi.
        // Bu FOR UPDATE o'tkazib yuborgan phantom insert'ni ushlab qoladi.
        const pgCode =
          (err as { driverError?: { code?: string }; code?: string })
            ?.driverError?.code ?? (err as { code?: string })?.code;
        if (pgCode === '23P01') {
          throw new ConflictException(
            `Property ${dto.propertyId} bu sanalar uchun allaqachon band`,
          );
        }
        throw err;
      }
    });

    // 3. Property ni band qil (compensating action: muvaffaqiyatsiz bo'lsa booking FAILED)
    try {
      await firstValueFrom(
        this.propertyClient.send('property.setAvailability', {
          id: dto.propertyId,
          isAvailable: false,
        }),
      );
    } catch {
      // Compensating action: property update muvaffaqiyatsiz — booking bekor
      await this.bookingRepo.update(booking.id, {
        status: BookingStatus.FAILED,
      });
      throw new InternalServerErrorException(
        'Property holati yangilanmadi, bron bekor qilindi',
      );
    }

    return booking;
  }

  findAll(): Promise<Booking[]> {
    return this.bookingRepo.find();
  }

  findByUser(userId: string): Promise<Booking[]> {
    return this.bookingRepo.find({ where: { userId } });
  }

  async findOne(id: string, userId?: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOneBy({ id });
    if (!booking) throw new NotFoundException(`Booking #${id} topilmadi`);
    if (userId && booking.userId !== userId) {
      throw new ForbiddenException("Bu bronni ko'rish huquqingiz yo'q");
    }
    return booking;
  }

  async cancel(id: string, userId: string): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.userId !== userId) {
      throw new ForbiddenException("Bu bronni bekor qilish huquqingiz yo'q");
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Bron allaqachon bekor qilingan');
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Faqat CONFIRMED bronni bekor qilish mumkin',
      );
    }

    booking.status = BookingStatus.CANCELLED;
    await this.bookingRepo.save(booking);

    // Propertyni bo'sh qil (compensating: muvaffaqiyatsiz bo'lsa booking qayta CONFIRMED)
    try {
      await firstValueFrom(
        this.propertyClient.send('property.setAvailability', {
          id: booking.propertyId,
          isAvailable: true,
        }),
      );
    } catch {
      // Compensating action: property update muvaffaqiyatsiz — bronni tiklash
      await this.bookingRepo.update(booking.id, {
        status: BookingStatus.CONFIRMED,
      });
      throw new InternalServerErrorException(
        'Property holati yangilanmadi, bron bekor qilinmadi',
      );
    }

    return booking;
  }
}
