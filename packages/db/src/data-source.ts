import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Parent } from './entities/parent.entity';
import { Student } from './entities/student.entity';
import { School } from './entities/school.entity';
import { Region } from './entities/region.entity';
import { ServiceRequest } from './entities/service-request.entity';
import { RequestStudent } from './entities/request-student.entity';
import { Provider } from './entities/provider.entity';
import { ProviderSchool } from './entities/provider-school.entity';
import { ProviderRegion } from './entities/provider-region.entity';
import { PackageEntity } from './entities/package.entity';
import { ProviderSubscription } from './entities/provider-subscription.entity';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleDocument } from './entities/vehicle-document.entity';
import { Offer } from './entities/offer.entity';
import { OtpRequest } from './entities/otp-request.entity';
import { AdminUser } from './entities/admin-user.entity';
import { Setting } from './entities/setting.entity';
import { Review } from './entities/review.entity';
import { StudentGuardian } from './entities/student-guardian.entity';
import { ProviderDismissal } from './entities/provider-dismissal.entity';
import { Notification } from './entities/notification.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Payment } from './entities/payment.entity';
import { DocumentDefinition } from './entities/document-definition.entity';
import { ProviderDocument } from './entities/provider-document.entity';
import { Driver } from './entities/driver.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { MobilePushToken } from './entities/mobile-push-token.entity';
import { Trip, TripEnrollment } from './entities/trip.entity';
import { EnabledCity } from './entities/enabled-city.entity';
import { AdminActivityLog } from './entities/admin-activity-log.entity';

export const entities = [
  Parent,
  Student,
  School,
  Region,
  ServiceRequest,
  RequestStudent,
  Provider,
  ProviderSchool,
  ProviderRegion,
  PackageEntity,
  ProviderSubscription,
  Vehicle,
  VehicleDocument,
  Offer,
  OtpRequest,
  AdminUser,
  Setting,
  Review,
  StudentGuardian,
  ProviderDismissal,
  Notification,
  Enrollment,
  Payment,
  DocumentDefinition,
  ProviderDocument,
  Driver,
  DriverDocument,
  PushSubscription,
  MobilePushToken,
  Trip,
  TripEnrollment,
  EnabledCity,
  AdminActivityLog,
];

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
  logging: process.env.DB_LOGGING === '1',
};

export const AppDataSource = new DataSource(dataSourceOptions);
