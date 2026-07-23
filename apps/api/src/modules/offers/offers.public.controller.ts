import { Body, Controller, Param, Post } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { OffersService } from './offers.service';

class SelectDto {
  @IsUUID() offerId!: string;
}

@Controller('requests/:token/offers')
export class OffersPublicController {
  constructor(private readonly svc: OffersService) {}

  @Post('select')
  select(@Param('token') token: string, @Body() dto: SelectDto) {
    return this.svc.selectByMagicToken(token, dto.offerId);
  }

  @Post('unselect')
  unselect(@Param('token') token: string) {
    return this.svc.unselectByMagicToken(token);
  }
}
