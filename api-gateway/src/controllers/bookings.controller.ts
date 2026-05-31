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
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import { CreateBookingDto } from '../dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(
    @Inject('BOOKING_SERVICE')
    private readonly bookingClient: ClientProxy,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@Body() body: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingClient.send('booking.create', {
      ...body,
      userId: user.sub,
    });
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
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string) {
    return this.bookingClient.send('booking.cancel', { id });
  }
}
