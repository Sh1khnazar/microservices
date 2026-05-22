import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking, BookingStatus } from './entities/booking.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    @Inject('USER_SERVICE')
    private readonly userClient: ClientProxy,

    @Inject('PROPERTY_SERVICE')
    private readonly propertyClient: ClientProxy,
  ) {}

  async create(dto: CreateBookingDto) {
    // 1. User bormi?
    const user = await firstValueFrom(
      this.userClient.send('user.findOne', { id: dto.userId }),
    );
    if (!user) throw new NotFoundException('User topilmadi');

    // 2. Property bormi va bo'shmi?
    const property = await firstValueFrom(
      this.propertyClient.send('property.findOne', { id: dto.propertyId }),
    );
    if (!property) throw new NotFoundException('Property topilmadi');
    if (!property.isAvailable) throw new BadRequestException('Property band');

    // 3. Narx hisoblash
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
    const totalPrice = days * Number(property.price);

    // 4. Booking saqlash
    const booking = this.bookingRepo.create({
      ...dto,
      totalPrice,
      status: BookingStatus.CONFIRMED,
    });
    await this.bookingRepo.save(booking);

    // 5. Propertyni band qilish
    await firstValueFrom(
      this.propertyClient.send('property.setAvailability', {
        id: dto.propertyId,
        isAvailable: false,
      }),
    );

    return booking;
  }

  findAll(): Promise<Booking[]> {
    return this.bookingRepo.find();
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOneBy({ id });
    if (!booking) throw new NotFoundException(`Booking #${id} topilmadi`);
    return booking;
  }

  async cancel(id: string): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Bron allaqachon bekor qilingan');
    }
    booking.status = BookingStatus.CANCELLED;
    await this.bookingRepo.save(booking);

    // Propertyni bo'sh qilish
    await firstValueFrom(
      this.propertyClient.send('property.setAvailability', {
        id: booking.propertyId,
        isAvailable: true,
      }),
    );

    return booking;
  }
}
