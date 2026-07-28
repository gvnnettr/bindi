import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Trip, TripEnrollment, Enrollment, StudentGuardian, Offer } from '@servis/db';
import { TripsService } from './trips.service';
import {
  ProviderTripsController,
  ParentTripsController,
  ProviderVehicleAssignController,
  ProviderEnrollmentAssignController,
} from './trips.controller';
import { ProvidersModule } from '../providers/providers.module';
import { ParentsModule } from '../parents/parents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripEnrollment, Enrollment, StudentGuardian, Offer]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
    ProvidersModule,
    ParentsModule,
  ],
  controllers: [
    ProviderTripsController,
    ParentTripsController,
    ProviderVehicleAssignController,
    ProviderEnrollmentAssignController,
  ],
  providers: [TripsService],
})
export class TripsModule {}
