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

  @MessagePattern('booking.findAll')
  findAll() {
    return this.bookingsService.findAll();
  }

  @MessagePattern('booking.findOne')
  findOne(@Payload() data: { id: string }) {
    return this.bookingsService.findOne(data.id);
  }

  @MessagePattern('booking.cancel')
  cancel(@Payload() data: { id: string }) {
    return this.bookingsService.cancel(data.id);
  }
}
