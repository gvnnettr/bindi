/** Haversine — iki noktanın büyük dairede kilometre cinsinden mesafesi */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

/** Şehir içi ortalama hızla dakika tahmini (default 40 km/h) */
export function etaMinutes(km: number, avgKmh: number = 40): number {
  if (!isFinite(km) || km <= 0) return 0;
  return Math.round((km / avgKmh) * 60);
}
