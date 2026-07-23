import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackageEntity } from '@servis/db';
import { PublicPackagesController } from './public-packages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PackageEntity])],
  controllers: [PublicPackagesController],
})
export class PublicPackagesModule {}
