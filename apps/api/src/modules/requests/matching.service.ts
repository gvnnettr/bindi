import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { Provider, ProviderSchool, ProviderRegion, ProviderSubscription } from '@servis/db';
import { PACKAGE_CODES, PROVIDER_STATUS } from '@servis/shared';

export interface MatchInput {
  schoolIds: string[];
  city: string;
  district: string;
  latitude?: number | null;
  longitude?: number | null;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(Provider) private readonly providers: Repository<Provider>,
    @InjectRepository(ProviderSchool)
    private readonly providerSchools: Repository<ProviderSchool>,
    @InjectRepository(ProviderRegion)
    private readonly providerRegions: Repository<ProviderRegion>,
    @InjectRepository(ProviderSubscription)
    private readonly subs: Repository<ProviderSubscription>,
  ) {}

  /**
   * Bir talep için hangi servisçiler eşleşir?
   * Kriter:
   * - status=active, aktif "teklif" aboneliği
   * - En az bir okul kayıtlı
   * - Servisçinin bölge kayıtları arasında ya (city+district) eşleşir
   *   ya da talep lat/lng varken lokasyon bölgesi (radius) içindedir
   */
  async findMatchingProviders(input: MatchInput): Promise<Provider[]> {
    if (input.schoolIds.length === 0) return [];

    const nowActiveSubs = await this.subs.find({
      where: {
        packageCode: PACKAGE_CODES.TEKLIF,
        endsAt: MoreThan(new Date()),
      },
    });
    const activeProviderIds = Array.from(
      new Set(nowActiveSubs.filter((s) => s.approvedAt !== null).map((s) => s.providerId)),
    );
    if (activeProviderIds.length === 0) return [];

    const schoolMatches = await this.providerSchools.find({
      where: {
        school: { id: In(input.schoolIds) },
        provider: { id: In(activeProviderIds) },
      },
      relations: ['provider', 'school'],
    });
    const schoolProviderIds = Array.from(
      new Set(schoolMatches.map((m) => m.provider.id)),
    );
    if (schoolProviderIds.length === 0) return [];

    // Bu servisçilerin TÜM bölge kayıtlarını çek (hem il/ilçe hem lokasyon)
    const regions = await this.providerRegions.find({
      where: { provider: { id: In(schoolProviderIds) } },
      relations: ['provider'],
    });

    const matched = new Set<string>();
    for (const r of regions) {
      const pid = r.provider.id;
      if (matched.has(pid)) continue;
      // İl/ilçe kaydı
      if (
        r.city === input.city &&
        r.district === input.district &&
        !(r.latitude && r.longitude && r.radiusKm)
      ) {
        matched.add(pid);
        continue;
      }
      // Lokasyon bazlı: hem region hem talep lat/lng olmalı
      if (
        r.latitude !== null &&
        r.longitude !== null &&
        r.radiusKm !== null &&
        typeof input.latitude === 'number' &&
        typeof input.longitude === 'number'
      ) {
        const d = haversineKm(r.latitude, r.longitude, input.latitude, input.longitude);
        if (d <= r.radiusKm) matched.add(pid);
      }
    }
    if (matched.size === 0) return [];

    return this.providers.find({
      where: { id: In(Array.from(matched)), status: PROVIDER_STATUS.ACTIVE },
    });
  }
}
