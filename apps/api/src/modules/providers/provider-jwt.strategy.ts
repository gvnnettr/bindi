import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ProvidersService } from './providers.service';

export interface ProviderRequest extends Request {
  provider: { id: string };
}

@Injectable()
export class ProviderJwtStrategy implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly providers: ProvidersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<ProviderRequest>();
    const auth = req.headers.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) throw new UnauthorizedException('Token yok');
    let payload: { sub: string; role: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Geçersiz token');
    }
    if (payload.role !== 'provider') throw new ForbiddenException();
    const active = await this.providers.hasActiveTeklifSubscription(payload.sub);
    if (!active) throw new ForbiddenException('Aktif Teklif aboneliği yok');
    req.provider = { id: payload.sub };
    return true;
  }
}
