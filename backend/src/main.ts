import 'reflect-metadata';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { rateLimit } from './ratelimit';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '16mb' }); // картинки-референсы в генераторе
  app.setGlobalPrefix('api');
  // Вход и регистрация: не больше 30 запросов в минуту с одного адреса.
  app.use('/api/auth/login', rateLimit(30, 60_000));
  app.use('/api/auth/register', rateLimit(20, 60_000));
  app.use('/api/auth/forgot', rateLimit(5, 60_000));
  app.use('/api/auth/reset', rateLimit(10, 60_000));
  app.use('/api/auth/verify', rateLimit(15, 60_000));
  // Веб-клиент ходит через тот же домен (nginx), CORS нужен только для разработки.
  app.enableCors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true });
  const FIELD: Record<string, string> = {
    name: 'Имя', email: 'E-mail', password: 'Пароль', role: 'Роль', grade: 'Класс', gender: 'Пол', code: 'Код', consent: 'Согласие',
    answer: 'Ответ', title: 'Название', text: 'Текст', subject: 'Тема письма', delta: 'Число', days: 'Число дней',
  };
  const ruMessage = (e: ValidationError): string => {
    const f = FIELD[e.property] ?? e.property;
    const c = Object.keys(e.constraints ?? {})[0];
    const m = e.constraints?.[c] ?? '';
    const n = m.match(/(\d+)/)?.[1];
    switch (c) {
      case 'minLength': return `${f}: слишком короткое значение (минимум ${n} симв.)`;
      case 'maxLength': return `${f}: слишком длинное значение (максимум ${n} симв.)`;
      case 'isEmail': return 'Проверьте адрес электронной почты';
      case 'isNotEmpty': case 'isString': return `${f}: заполните поле`;
      case 'equals': return 'Нужно ваше согласие с правилами';
      case 'isIn': return `${f}: выберите значение из списка`;
      case 'min': case 'max': case 'isInt': case 'isNumber': return `${f}: недопустимое число`;
      default: return `${f}: неверное значение`;
    }
  };
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => new BadRequestException(errors.map(ruMessage)),
    }),
  );
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

bootstrap();
