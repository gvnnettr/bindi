import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString, Length } from 'class-validator';
import { AdminService } from './admin.service';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @Length(4, 100) password!: string;
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly svc: AdminService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.svc.login(dto.email, dto.password);
  }
}
