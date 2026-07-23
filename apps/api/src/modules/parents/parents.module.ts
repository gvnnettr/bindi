import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  Parent,
  ServiceRequest,
  Review,
  Provider,
  Offer,
  Student,
  RequestStudent,
  School,
  StudentGuardian,
} from '@servis/db';
import { OtpModule } from '../otp/otp.module';
import { RequestsModule } from '../requests/requests.module';
import { ParentsService } from './parents.service';
import { ParentsAuthController } from './parents.auth.controller';
import { ParentsMeController } from './parents.me.controller';
import { ParentJwtGuard } from './parent-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parent,
      ServiceRequest,
      Review,
      Provider,
      Offer,
      Student,
      RequestStudent,
      School,
      StudentGuardian,
    ]),
    OtpModule,
    RequestsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [ParentsAuthController, ParentsMeController],
  providers: [ParentsService, ParentJwtGuard],
  exports: [ParentsService, ParentJwtGuard, JwtModule],
})
export class ParentsModule {}
