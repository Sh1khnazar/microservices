import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @MessagePattern('booking.create')
  create(@Payload() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @MessagePattern('booking.findByUser')
  findByUser(@Payload() data: { userId: string }) {
    return this.bookingsService.findByUser(data.userId);
  }

  @MessagePattern('booking.findAll')
  findAll() {
    return this.bookingsService.findAll();
  }

  @MessagePattern('booking.findOne')
  findOne(@Payload() data: { id: string; userId: string }) {
    return this.bookingsService.findOne(data.id, data.userId);
  }

  @MessagePattern('booking.cancel')
  cancel(@Payload() data: { id: string; userId: string }) {
    return this.bookingsService.cancel(data.id, data.userId);
  }
}
