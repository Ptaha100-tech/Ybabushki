import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AdminService } from './admin.service';
import { AuthGuard, AuthUser, CurrentUser, Roles } from './auth/guards';
import { Role } from './entities';

class BlockDto { @IsBoolean() blocked: boolean }
class RoleDto { @IsIn(['student', 'teacher', 'parent', 'admin']) role: Role }
class CoinsDto { @IsInt() @Min(-100000) @Max(100000) delta: number }
class BroadcastDto {
  @IsString() @MinLength(3) @MaxLength(120) subject: string;
  @IsString() @MinLength(5) @MaxLength(5000) text: string;
  @IsIn(['all', 'student', 'teacher', 'parent']) audience: string;
  @IsBoolean() dryRun: boolean;
}

/** Админ-панель: доступна только пользователям с ролью admin. */
@Controller('admin')
@UseGuards(AuthGuard)
@Roles('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('stats') stats() { return this.admin.stats(); }
  @Get('users') list(@Query('q') q?: string, @Query('role') role?: string, @Query('page') page?: string) { return this.admin.list({ q, role, page: Number(page) }); }
  @Get('users/:id') detail(@Param('id', ParseUUIDPipe) id: string) { return this.admin.detail(id); }
  @Post('users/:id/block') block(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() d: BlockDto) { return this.admin.setBlocked(a.id, id, d.blocked); }
  @Post('users/:id/role') role(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() d: RoleDto) { return this.admin.setRole(a.id, id, d.role); }
  @Post('users/:id/verify') verify(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.verifyEmail(a.id, id); }
  @Post('users/:id/coins') coins(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() d: CoinsDto) { return this.admin.addCoins(a.id, id, d.delta); }
  @Post('users/:id/password') password(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.tempPassword(a.id, id); }
  @Delete('users/:id') remove(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.remove(a.id, id); }
  @Get('topics') topics(@Query('q') q?: string) { return this.admin.topics(q); }
  @Post('broadcast') broadcast(@Body() d: BroadcastDto) { return this.admin.broadcast(d.subject, d.text, d.audience, d.dryRun); }
}
