import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '@servis/db';
import { SettingsService } from './settings.service';
import { PublicSettingsController } from './public-settings.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [PublicSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
