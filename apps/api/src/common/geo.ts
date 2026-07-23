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

/**
 * OSM Nominatim ile ücretsiz reverse-geocoding.
 * Kullanım politikası: max 1 req/sn, User-Agent zorunlu.
 * Bindi için: veli talep açtığında address text -> lat/lng bul (best-effort).
 */
export async function geocodeAddress(parts: {
  city: string;
  district: string;
  neighborhood?: string | null;
  address?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const queryParts = [
    parts.address,
    parts.neighborhood,
    parts.district,
    parts.city,
    'Türkiye',
  ].filter(Boolean);
  const q = encodeURIComponent(queryParts.join(', '));
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=tr`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Bindi/1.0 (contact: destek@bindi.com.tr)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const lat = parseFloat(arr[0].lat);
    const lng = parseFloat(arr[0].lon);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
