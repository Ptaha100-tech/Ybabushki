import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ArtService } from './art.service';
import { ImagesService } from './images.service';
import { AdminService } from './admin.service';
import { AuthGuard, AuthUser, CurrentUser, Roles } from './auth/guards';
import { Role } from './entities';

class SubDto { @IsInt() @Min(0) @Max(3650) days: number }
class ImageDto {
  @IsString() @MinLength(3) @MaxLength(3000) prompt: string;
  @IsString() @MaxLength(100) model: string;
  @IsOptional() @IsIn(['1:1', '4:3', '3:4', '16:9', '9:16']) aspectRatio?: string;
  @IsOptional() @IsIn(['auto', 'transparent', 'opaque']) background?: string;
  @IsOptional() @IsInt() @Min(1) @Max(4) n?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsString({ each: true }) @MaxLength(6_000_000, { each: true }) refs?: string[];
}
class ArtDto {
  @IsString() @MaxLength(80) key: string;
  @IsString() @MaxLength(6_000_000) data: string;
}
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
  constructor(private admin: AdminService, private images: ImagesService, private art: ArtService) {}

  @Post('art') artSet(@Body() d: ArtDto) { return this.art.set(d.key, d.data); }
  @Delete('art') artRemove(@Query('key') key: string) { return this.art.remove(key); }

  @Get('images/status') imageStatus() { return this.images.status(); }
  @Get('images/models') imageModels() { return this.images.models(); }
  @Post('images') imageGenerate(@Body() d: ImageDto) { return this.images.generate(d); }

  @Get('stats') stats() { return this.admin.stats(); }
  @Get('users') list(@Query('q') q?: string, @Query('role') role?: string, @Query('page') page?: string) { return this.admin.list({ q, role, page: Number(page) }); }
  @Get('users/:id') detail(@Param('id', ParseUUIDPipe) id: string) { return this.admin.detail(id); }
  @Post('users/:id/block') block(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() d: BlockDto) { return this.admin.setBlocked(a.id, id, d.blocked); }
  @Post('users/:id/role') role(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() d: RoleDto) { return this.admin.setRole(a.id, id, d.role); }
  @Post('users/:id/verify') verify(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.verifyEmail(a.id, id); }
  @Post('users/:id/coins') coins(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() d: CoinsDto) { return this.admin.addCoins(a.id, id, d.delta); }
  @Post('users/:id/password') password(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.tempPassword(a.id, id); }
  @Post('users/:id/subscription') grant(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() d: SubDto) { return this.admin.grantSub(a.id, id, d.days); }
  @Delete('users/:id/subscription') revoke(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.revokeSub(a.id, id); }
  @Delete('users/:id') remove(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.remove(a.id, id); }
  @Get('topics') topics(@Query('q') q?: string) { return this.admin.topics(q); }
  @Post('broadcast') broadcast(@Body() d: BroadcastDto) { return this.admin.broadcast(d.subject, d.text, d.audience, d.dryRun); }
}
