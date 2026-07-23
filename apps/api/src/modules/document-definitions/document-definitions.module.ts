import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DocumentDefinition } from '@servis/db';
import { DocumentDefinitionsController } from './document-definitions.controller';
import { DocumentDefinitionsPublicController } from './document-definitions.public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentDefinition]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
  ],
  controllers: [
    DocumentDefinitionsController,
    DocumentDefinitionsPublicController,
  ],
  exports: [TypeOrmModule],
})
export class DocumentDefinitionsModule {}
