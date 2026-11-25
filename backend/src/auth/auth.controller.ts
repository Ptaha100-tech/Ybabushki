import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService, ForgotDto, LoginDto, RegisterDto, ResetDto, VerifyDto } from './auth.service';
import { AuthGuard, AuthUser, CurrentUser } from './guards';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('forgot')
  forgot(@Body() dto: ForgotDto) {
    return this.auth.forgot(dto);
  }

  @Post('reset')
  reset(@Body() dto: ResetDto) {
    return this.auth.reset(dto);
  }

  @UseGuards(AuthGuard)
  @Post('verify/send')
  verifySend(@CurrentUser() user: AuthUser) {
    return this.auth.resendVerify(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('verify')
  verify(@CurrentUser() user: AuthUser, @Body() dto: VerifyDto) {
    return this.auth.verify(user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
