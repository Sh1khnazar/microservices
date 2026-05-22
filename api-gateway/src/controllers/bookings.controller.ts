import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('bookings')
export class BookingsController {
  constructor(
    @Inject('BOOKING_SERVICE')
    private readonly bookingClient: ClientProxy,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) {
    return this.bookingClient.send('booking.create', body);
  }

  @Get()
  findAll() {
    return this.bookingClient.send('booking.findAll', {});
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingClient.send('booking.findOne', { id });
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.bookingClient.send('booking.cancel', { id });
  }
}
