import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { dataSourceOptions } from '@servis/db';
import { OtpModule } from './modules/otp/otp.module';
import { RequestsModule } from './modules/requests/requests.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { OffersModule } from './modules/offers/offers.module';
import { ParentsModule } from './modules/parents/parents.module';
import { AdminModule } from './modules/admin/admin.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SmsModule } from './modules/sms/sms.module';
import { MailModule } from './modules/mail/mail.module';
import { ContactModule } from './modules/contact/contact.module';
import { PublicPackagesModule } from './modules/packages/public-packages.module';
import { DocumentExpiryModule } from './modules/documents/document-expiry.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { DocumentDefinitionsModule } from './modules/document-definitions/document-definitions.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { PushModule } from './modules/push/push.module';
import { TripsModule } from './modules/trips/trips.module';
import { CitiesModule } from './modules/cities/cities.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['/var/www/servis-platform/.env', '../../.env', '.env'],
    }),
    TypeOrmModule.forRoot({ ...dataSourceOptions, autoLoadEntities: false }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    SettingsModule,
    NotificationsModule,
    SmsModule,
    MailModule,
    OtpModule,
    SchoolsModule,
    ProvidersModule,
    RequestsModule,
    OffersModule,
    ParentsModule,
    AdminModule,
    ContactModule,
    PublicPackagesModule,
    DocumentExpiryModule,
    EnrollmentsModule,
    DocumentDefinitionsModule,
    DriversModule,
    PushModule,
    TripsModule,
    CitiesModule,
    AuthModule,
  ],
})
export class AppModule {}
