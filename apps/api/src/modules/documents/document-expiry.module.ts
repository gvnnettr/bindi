import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { VehicleDocument, Vehicle, Provider } from '@servis/db';
import { DocumentExpiryService } from './document-expiry.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([VehicleDocument, Vehicle, Provider]),
  ],
  providers: [DocumentExpiryService],
  exports: [DocumentExpiryService],
})
export class DocumentExpiryModule {}
