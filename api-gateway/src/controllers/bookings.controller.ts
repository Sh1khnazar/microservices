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

  // Foydalanuvchi faqat o'z bronlarini ko'radi (booking-service userId bo'yicha filtrlaydi)
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.bookingClient.send('booking.findByUser', { userId: user.sub });
  }

  // Egalik tekshiruvi Variant B: service userId ni qabul qilib o'zi tekshiradi.
  // Sabab: servis o'z ma'lumotini himoya qilgani toza (gateway ikki marta murojaat qilmaydi).
  // Mos kelmasa service RpcException(403) qaytaradi → RpcExceptionFilter → 403 Forbidden.
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingClient.send('booking.findOne', { id, userId: user.sub });
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingClient.send('booking.cancel', { id, userId: user.sub });
  }
}
