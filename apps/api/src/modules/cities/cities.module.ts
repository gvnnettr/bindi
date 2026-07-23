import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EnabledCity } from '@servis/db';
import { CitiesService } from './cities.service';
import { CitiesPublicController, CitiesAdminController } from './cities.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnabledCity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
    AdminModule,
  ],
  controllers: [CitiesPublicController, CitiesAdminController],
  providers: [CitiesService],
})
export class CitiesModule {}
