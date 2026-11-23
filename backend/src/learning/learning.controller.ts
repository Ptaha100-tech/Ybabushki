import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/guards';
import { LearningService } from './learning.service';

export class AnswerDto {
  @IsString() @MaxLength(50) answer: string;
  @IsOptional() @IsUUID() homeworkId?: string;
}

@Controller()
@UseGuards(AuthGuard)
export class LearningController {
  constructor(private learning: LearningService) {}

  @Get('topics')
  topics() {
    return this.learning.listTopics();
  }

  @Roles('student')
  @Get('topics/:id/next')
  next(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) topicId: string,
    @Query('homeworkId') homeworkId?: string,
    @Query('exclude') exclude?: string,
  ) {
    return this.learning.nextTask(user.id, topicId, homeworkId || undefined, exclude || undefined);
  }

  @Roles('student')
  @Post('tasks/:id/answer')
  answer(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) taskId: string, @Body() dto: AnswerDto) {
    return this.learning.answer(user.id, taskId, dto.answer, dto.homeworkId);
  }

  @Roles('student')
  @Get('me/stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.learning.studentStats(user.id);
  }

  @Roles('student')
  @Get('me/homework')
  homework(@CurrentUser() user: AuthUser) {
    return this.learning.myHomework(user.id);
  }
}
