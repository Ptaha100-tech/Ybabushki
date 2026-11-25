import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { publicUser, randomCode } from '../common';
import { Role, User } from '../entities';

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) @MaxLength(100) password: string;
  @IsString() @MinLength(2) @MaxLength(60) name: string;
  @IsIn(['student', 'teacher', 'parent']) role: Role;
  @IsOptional() @IsInt() @Min(1) @Max(11) grade?: number;
  @IsIn(['m', 'f']) gender: 'm' | 'f';
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private users: Repository<User>, private jwt: JwtService) {}

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
    });
    await this.users.save(user);
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
