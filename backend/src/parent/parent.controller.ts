import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/guards';
import { ReportsService } from '../reports.service';
import { ParentService } from './parent.service';

export class LinkDto {
  @IsString() @MinLength(4) @MaxLength(12) code: string;
}

export class ReportsDto {
  @IsBoolean() enabled: boolean;
}

export class SubscribeDto {
  @IsUUID() studentId: string;
  @IsIn(['month', 'year']) plan: string;
}

@Controller('parent')
@UseGuards(AuthGuard)
@Roles('parent')
export class ParentController {
  constructor(private parent: ParentService, private reports: ReportsService) {}

  @Post('link')
  link(@CurrentUser() user: AuthUser, @Body() dto: LinkDto) {
    return this.parent.link(user.id, dto.code);
  }

  @Post('report-now')
  reportNow(@CurrentUser() user: AuthUser) {
    return this.reports.sendNow(user.id);
  }

  @Post('reports')
  setReports(@CurrentUser() user: AuthUser, @Body() dto: ReportsDto) {
    return this.reports.setEnabled(user.id, dto.enabled);
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
