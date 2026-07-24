import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  Enrollment,
  Payment,
  Offer,
  ServiceRequest,
  RequestStudent,
  ProviderSubscription,
  Parent,
  Provider,
} from '@servis/db';
import { EnrollmentsService } from './enrollments.service';
import { PaymentReminderService } from './payment-reminder.service';
import {
  EnrollmentsMeController,
  ProviderPaymentsController,
} from './enrollments.me.controller';
import { ParentPaymentsController } from './parent-payments.controller';
import { ProvidersModule } from '../providers/providers.module';
import { ParentsModule } from '../parents/parents.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enrollment,
      Payment,
      Offer,
      ServiceRequest,
      RequestStudent,
      ProviderSubscription,
      Parent,
      Provider,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
    ProvidersModule,
    ParentsModule,
    SmsModule,
  ],
  controllers: [
    EnrollmentsMeController,
    ProviderPaymentsController,
    ParentPaymentsController,
  ],
  providers: [EnrollmentsService, PaymentReminderService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
