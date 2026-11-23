import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/guards';
import { ParentService } from './parent.service';

export class LinkDto {
  @IsString() @MinLength(4) @MaxLength(12) code: string;
}

export class SubscribeDto {
  @IsUUID() studentId: string;
  @IsIn(['month', 'year']) plan: string;
}

@Controller('parent')
@UseGuards(AuthGuard)
@Roles('parent')
export class ParentController {
  constructor(private parent: ParentService) {}

  @Post('link')
  link(@CurrentUser() user: AuthUser, @Body() dto: LinkDto) {
    return this.parent.link(user.id, dto.code);
  }

  @Get('children')
  children(@CurrentUser() user: AuthUser) {
    return this.parent.children(user.id);
  }

  @Post('subscribe')
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    return this.parent.subscribe(user.id, dto.studentId, dto.plan);
  }
}
