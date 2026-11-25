import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { rateLimit } from './ratelimit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // Вход и регистрация: не больше 30 запросов в минуту с одного адреса.
  app.use('/api/auth/login', rateLimit(30, 60_000));
  app.use('/api/auth/register', rateLimit(20, 60_000));
  app.use('/api/auth/forgot', rateLimit(5, 60_000));
  app.use('/api/auth/reset', rateLimit(10, 60_000));
  app.use('/api/auth/verify', rateLimit(15, 60_000));
  // Веб-клиент ходит через тот же домен (nginx), CORS нужен только для разработки.
  app.enableCors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

bootstrap();
