import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Equals, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { publicUser, randomCode } from '../common';
import { Role, User } from '../entities';
import { MailerService } from '../mailer.service';
import { createHash, randomInt } from 'crypto';

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) @MaxLength(100) password: string;
  @IsString() @MinLength(2) @MaxLength(60) name: string;
  @IsIn(['student', 'teacher', 'parent']) role: Role;
  @IsOptional() @IsInt() @Min(1) @Max(11) grade?: number;
  @IsIn(['m', 'f']) gender: 'm' | 'f';
  /** Согласие с политикой конфиденциальности и условиями. */
  @Equals(true, { message: 'Нужно принять политику конфиденциальности и условия' }) consent: boolean;
}

export class ForgotDto {
  @IsEmail() email: string;
}

export class ResetDto {
  @IsEmail() email: string;
  @IsString() @MinLength(4) @MaxLength(10) code: string;
  @IsString() @MinLength(6) @MaxLength(100) password: string;
}

export class VerifyDto {
  @IsString() @MinLength(4) @MaxLength(10) code: string;
}

const CODE_TTL_MS = 30 * 60_000;
const MAX_ATTEMPTS = 5;
const hashCode = (c: string) => createHash('sha256').update(c + (process.env.JWT_SECRET ?? '')).digest('hex');
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private users: Repository<User>, private jwt: JwtService, private mailer: MailerService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException('Этот e-mail уже зарегистрирован');
    }
    const user = this.users.create({
      email,
      name: dto.name.trim(),
      role: dto.role,
      passwordHash: await bcrypt.hash(dto.password, 10),
      linkCode: dto.role === 'student' ? await this.freeLinkCode() : null,
      classroomId: null,
      grade: dto.role === 'student' ? dto.grade ?? null : null,
      gender: dto.gender,
      lastActiveDate: null,
      consentAt: new Date(),
    });
    await this.users.save(user);
    this.sendVerify(user).catch(() => undefined);
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email.trim().toLowerCase() } });
    const ok = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !ok) throw new UnauthorizedException('Неверный e-mail или пароль');
    return this.session(user);
  }

  async me(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    return publicUser(user);
  }

  /** Письмо с кодом подтверждения почты (вызывается при регистрации и по кнопке в профиле). */
  async sendVerify(user: User) {
    if (user.emailVerified) return;
    const code = newCode();
    user.verifyHash = hashCode(code);
    user.verifyExpires = new Date(Date.now() + CODE_TTL_MS);
    user.verifyAttempts = 0;
    await this.users.save(user);
    await this.mailer.send(user.email, 'Подтверждение почты — Моя школа', `Ваш код подтверждения: ${code}\nКод действует 30 минут.`);
  }

  async resendVerify(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    await this.sendVerify(user);
    return { ok: true, mail: this.mailer.enabled };
  }

  async verify(id: string, dto: VerifyDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    if (user.emailVerified) return publicUser(user);
    const bad = () => new BadRequestException('Неверный или просроченный код');
    if (!user.verifyHash || !user.verifyExpires || user.verifyExpires < new Date() || user.verifyAttempts >= MAX_ATTEMPTS) throw bad();
    if (user.verifyHash !== hashCode(dto.code.trim())) {
      user.verifyAttempts += 1;
      await this.users.save(user);
      throw bad();
    }
    user.emailVerified = true;
    user.verifyHash = null;
    user.verifyExpires = null;
    await this.users.save(user);
    return publicUser(user);
  }

  /** Всегда отвечает одинаково, чтобы нельзя было выяснить, какие почты зарегистрированы. */
  async forgot(dto: ForgotDto) {
    const user = await this.users.findOne({ where: { email: dto.email.trim().toLowerCase() } });
    if (user) {
      const code = newCode();
      user.resetHash = hashCode(code);
      user.resetExpires = new Date(Date.now() + CODE_TTL_MS);
      user.resetAttempts = 0;
      await this.users.save(user);
      await this.mailer.send(user.email, 'Сброс пароля — Моя школа', `Код для смены пароля: ${code}\nКод действует 30 минут. Если вы не просили сбросить пароль, просто проигнорируйте письмо.`);
    }
    return { ok: true, mail: this.mailer.enabled };
  }

  async reset(dto: ResetDto) {
    const user = await this.users.findOne({ where: { email: dto.email.trim().toLowerCase() } });
    const bad = () => new BadRequestException('Неверный или просроченный код');
    if (!user || !user.resetHash || !user.resetExpires || user.resetExpires < new Date() || user.resetAttempts >= MAX_ATTEMPTS) throw bad();
    if (user.resetHash !== hashCode(dto.code.trim())) {
      user.resetAttempts += 1;
      await this.users.save(user);
      throw bad();
    }
    user.passwordHash = await bcrypt.hash(dto.password, 10);
    user.resetHash = null;
    user.resetExpires = null;
    user.emailVerified = true; // код пришёл на эту почту — значит, она настоящая
    await this.users.save(user);
    return this.session(user);
  }

  private async session(user: User) {
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: publicUser(user) };
  }

  private async freeLinkCode(): Promise<string> {
    for (;;) {
      const code = randomCode(6);
      if (!(await this.users.findOne({ where: { linkCode: code } }))) return code;
    }
  }
}
