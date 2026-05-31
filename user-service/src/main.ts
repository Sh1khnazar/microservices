import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL!],
      queue: 'user_queue',
      queueOptions: { durable: true },
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableShutdownHooks();

  await app.startAllMicroservices();
  const healthPort = parseInt(process.env.HEALTH_PORT ?? '3001', 10);
  await app.listen(healthPort);
  console.log(`User service: RMQ listening, health at http://localhost:${healthPort}/health`);
}
void bootstrap();
