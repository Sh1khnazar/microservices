import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BookingsController } from '././controllers/bookings.controller';
import { PropertiesController } from '././controllers/properties.controller';
import { UsersController } from '././controllers/users.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:secret@localhost:5672'],
          queue: 'user_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'PROPERTY_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:secret@localhost:5672'],
          queue: 'property_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'BOOKING_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:secret@localhost:5672'],
          queue: 'booking_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [UsersController, PropertiesController, BookingsController],
})
export class AppModule {}
