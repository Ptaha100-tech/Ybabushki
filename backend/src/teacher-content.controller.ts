import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser, Roles } from './auth/guards';
import { TeacherContentService } from './teacher-content.service';

export class CreateTopicDto {
  @IsString() @MinLength(2) @MaxLength(80) title: string;
  @IsInt() @Min(1) @Max(11) grade: number;
  @IsString() @MaxLength(30) subject: string;
  @IsString() @MaxLength(60000) text: string;
}

@Controller('teacher/topics')
@UseGuards(AuthGuard)
@Roles('teacher')
export class TeacherContentController {
  constructor(private content: TeacherContentService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.content.list(u.id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateTopicDto) {
    return this.content.create(u.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.content.remove(u.id, id);
  }
}
