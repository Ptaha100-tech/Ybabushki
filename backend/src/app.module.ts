import { Controller, Get, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/guards';
import { ClassesController } from './classes/classes.controller';
import { ClassesService } from './classes/classes.service';
import { ENTITIES } from './entities';
import { GamesController } from './learning/games.controller';
import { GamesService } from './learning/games.service';
import { LearningController } from './learning/learning.controller';
import { LearningService } from './learning/learning.service';
import { ParentController } from './parent/parent.controller';
import { ParentService } from './parent/parent.service';
import { SeedService } from './seed.service';
import { SubscriptionsService } from './subscriptions.service';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('Не задан JWT_SECRET (см. .env.example)');
}

@Controller('health')
class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: ENTITIES,
      // Для MVP схема создаётся автоматически. Перед реальным запуском перейдите на миграции
      // и выставьте DB_SYNC=false (см. README).
      synchronize: process.env.DB_SYNC !== 'false',
    }),
    TypeOrmModule.forFeature(ENTITIES),
    JwtModule.register({ global: true, secret: jwtSecret, signOptions: { expiresIn: '30d' } }),
  ],
  controllers: [HealthController, AuthController, LearningController, GamesController, ClassesController, ParentController],
  providers: [AuthService, AuthGuard, LearningService, GamesService, ClassesService, ParentService, SubscriptionsService, SeedService],
})
export class AppModule {}
