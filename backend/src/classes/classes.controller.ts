import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/guards';
import { ClassesService } from './classes.service';

export class CreateClassDto {
  @IsString() @MinLength(1) @MaxLength(60) name: string;
}

export class JoinClassDto {
  @IsString() @MinLength(4) @MaxLength(12) code: string;
}

export class HomeworkDto {
  @IsUUID() topicId: string;
  @IsOptional() @IsDateString() dueAt?: string;
}

@Controller('classes')
@UseGuards(AuthGuard)
export class ClassesController {
  constructor(private classes: ClassesService) {}

  @Roles('teacher')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClassDto) {
    return this.classes.create(user.id, dto.name);
  }

  @Roles('teacher')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.classes.listMine(user.id);
  }

  @Roles('student')
  @Post('join')
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinClassDto) {
    return this.classes.join(user.id, dto.code);
  }

  @Roles('teacher')
  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.classes.detail(user.id, id);
  }

  @Roles('teacher')
  @Post(':id/homework')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: HomeworkDto) {
    return this.classes.assignHomework(user.id, id, dto.topicId, dto.dueAt);
  }
}
