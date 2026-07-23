import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  Driver,
  DriverDocument,
  DocumentDefinition,
} from '@servis/db';
import { DriversService } from './drivers.service';
import { DriversMeController } from './drivers.me.controller';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, DriverDocument, DocumentDefinition]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
    ProvidersModule,
  ],
  controllers: [DriversMeController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
