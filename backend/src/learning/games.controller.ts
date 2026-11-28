import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsNumber, Max, Min } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/guards';
import { GamesService } from './games.service';

export class GameResultDto {
  @IsIn(['lightning', 'memory', 'balloons', 'truefalse', 'words', 'baskets', 'count']) game: string;
  @IsNumber() @Min(0) @Max(500) score: number;
}

@Controller()
@UseGuards(AuthGuard)
@Roles('student')
export class GamesController {
  constructor(private games: GamesService) {}

  @Get('games/lightning')
  lightning(@CurrentUser() u: AuthUser, @Query('subject') subject?: string, @Query('grade') grade?: string, @Query('mode') mode?: string) {
    return this.games.lightning(u.id, subject || undefined, grade ? Number(grade) : undefined, mode);
  }

  @Get('games/memory')
  memory(@CurrentUser() u: AuthUser, @Query('subject') subject?: string, @Query('grade') grade?: string) {
    return this.games.memory(u.id, subject || undefined, grade ? Number(grade) : undefined);
  }

  @Post('games/result')
  result(@CurrentUser() u: AuthUser, @Body() dto: GameResultDto) {
    return this.games.submit(u.id, dto.game, dto.score);
  }

  @Get('me/leaderboard')
  leaderboard(@CurrentUser() u: AuthUser) {
    return this.games.leaderboard(u.id);
  }
}
