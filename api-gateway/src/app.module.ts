import * as Joi from 'joi';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';
import { AuthController } from './controllers/auth.controller';
import { HealthController } from './controllers/health.controller';
import { BookingsController } from './controllers/bookings.controller';
import { PropertiesController } from './controllers/properties.controller';
import { UsersController } from './controllers/users.controller';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        RABBITMQ_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        PORT: Joi.number().default(3000),
      }),
    }),

    JwtModule.registerAsync({
      global: true,
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),

    TerminusModule,

    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL')!],
            queue: 'user_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
        imports: [ConfigModule],
      },
      {
        name: 'PROPERTY_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL')!],
            queue: 'property_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
        imports: [ConfigModule],
      },
      {
        name: 'BOOKING_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL')!],
            queue: 'booking_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
        imports: [ConfigModule],
      },
    ]),
  ],
  controllers: [
    HealthController,
    AuthController,
    UsersController,
    PropertiesController,
    BookingsController,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
