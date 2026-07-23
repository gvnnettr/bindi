'use client';

import { useState } from 'react';

export interface ReverseAddress {
  city?: string;
  district?: string;
  neighborhood?: string;
  street?: string;
  fullAddress?: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<ReverseAddress | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'tr' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address ?? {};
    const city =
      a.province || a.state || a.city || a.town || a.municipality || undefined;
    const district =
      a.county || a.city_district || a.district || a.town || undefined;
    const neighborhood =
      a.neighbourhood || a.suburb || a.quarter || a.village || undefined;
    const street =
      [a.road, a.pedestrian, a.residential].find(Boolean) ||
      undefined;
    const houseNumber = a.house_number;
    const streetLine = [street, houseNumber].filter(Boolean).join(' No: ');
    return {
      city,
      district: district === city ? undefined : district,
      neighborhood,
      street: streetLine || undefined,
      fullAddress: (data.display_name as string) ?? undefined,
    };
  } catch {
    return null;
  }
}

export function LocationButton({
  onLocation,
  label = 'Konumumu Al',
}: {
  onLocation: (lat: number, lng: number, reverse?: ReverseAddress | null) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function grab() {
    setError(null);
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum servisi desteklemiyor.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const reverse = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setLoading(false);
        onLocation(pos.coords.latitude, pos.coords.longitude, reverse);
      },
      (err) => {
        setLoading(false);
        setError(err.message || 'Konum alınamadı.');
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={grab}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm font-semibold text-charcoal-700 shadow-sm transition hover:border-sunset-400 hover:text-sunset-600 disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 2a8 8 0 018 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 018-8z" />
        </svg>
        {loading ? 'Alınıyor…' : label}
      </button>
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}

export function LocationChip({ lat, lng }: { lat: number; lng: number }) {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-sand-50 p-2 text-xs">
      <span className="font-semibold text-charcoal-700">Konum kaydedildi:</span>
      <span className="text-charcoal-600">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sunset-600 underline hover:text-sunset-700"
      >
        haritada gör
      </a>
    </div>
  );
}
