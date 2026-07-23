'use client';

import { useEffect, useRef, useState } from 'react';

export interface AsyncOption {
  label: string;
  value: string;
  sublabel?: string;
}

export function AsyncCombobox({
  value,
  onChange,
  fetcher,
  placeholder,
  disabled,
  className,
  minChars = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  fetcher: (query: string) => Promise<AsyncOption[]>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minChars?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<AsyncOption[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (query.length < minChars) {
      setOptions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const opts = await fetcher(query);
        setOptions(opts);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function pick(o: AsyncOption) {
    onChange(o.value);
    setQuery(o.value);
    setOpen(false);
  }

  return (
    <div className={'relative ' + (className ?? '')} ref={wrapRef}>
      <input
        className="input pr-9"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
      />
      {loading && (
        <div className="absolute inset-y-0 right-2 flex items-center">
          <svg
            className="h-4 w-4 animate-spin text-charcoal-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path
              d="M12 2a10 10 0 0110 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      )}

      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-charcoal-200 bg-white p-1 shadow-lg">
          {query.length < minChars ? (
            <div className="px-3 py-2 text-xs text-charcoal-500">
              En az {minChars} karakter yazın.
            </div>
          ) : loading ? (
            <div className="px-3 py-2 text-xs text-charcoal-500">Aranıyor…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-charcoal-500">
              Sonuç yok — yazdığınız değerle kaydedilir.
            </div>
          ) : (
            options.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(o)}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-charcoal-800 transition hover:bg-sand-100"
              >
                <div className="font-medium">{o.label}</div>
                {o.sublabel && (
                  <div className="text-xs text-charcoal-500">{o.sublabel}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// === Photon (autocomplete-optimize OSM) helpers ===

const PHOTON_URL = 'https://photon.komoot.io/api/';

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
  };
  geometry?: { coordinates: [number, number] };
}

async function photonSearch(
  q: string,
  osmTag?: string,
): Promise<PhotonFeature[]> {
  const params = new URLSearchParams({
    q,
    lang: 'tr',
    limit: '15',
  });
  if (osmTag) params.append('osm_tag', osmTag);
  const url = `${PHOTON_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []) as PhotonFeature[];
}

const NEIGHBORHOOD_VALUES = new Set([
  'suburb',
  'neighbourhood',
  'quarter',
  'village',
  'hamlet',
]);

const STREET_KEYS = new Set(['highway', 'street']);

export function makeNeighborhoodFetcher(city: string, district: string) {
  return async (input: string): Promise<AsyncOption[]> => {
    const q = [input, district, city].filter(Boolean).join(' ');
    // İlk deneme: place tag ile filtreli
    let items = await photonSearch(q, 'place');
    // Yalnızca TR ve mahalle-benzeri değerler
    let filtered = items.filter(
      (it) =>
        it.properties.countrycode === 'tr' &&
        (!it.properties.osm_value ||
          NEIGHBORHOOD_VALUES.has(it.properties.osm_value)),
    );
    // Bulunmazsa filtre gevşet
    if (filtered.length === 0) {
      items = await photonSearch(q);
      filtered = items.filter((it) => it.properties.countrycode === 'tr');
    }
    const map = new Map<string, AsyncOption>();
    for (const it of filtered) {
      const p = it.properties;
      const name = p.name;
      if (!name) continue;
      const key = name.toLocaleLowerCase('tr');
      if (map.has(key)) continue;
      const short = [name, p.city || p.district || p.county, p.state]
        .filter(Boolean)
        .join(' · ');
      map.set(key, { label: name, value: name, sublabel: short });
    }
    return Array.from(map.values()).slice(0, 10);
  };
}

export function makeStreetFetcher(
  city: string,
  district: string,
  neighborhood?: string,
) {
  return async (input: string): Promise<AsyncOption[]> => {
    const q = [input, neighborhood, district, city].filter(Boolean).join(' ');
    let items = await photonSearch(q, 'highway');
    let filtered = items.filter(
      (it) =>
        it.properties.countrycode === 'tr' &&
        (it.properties.osm_key === undefined ||
          STREET_KEYS.has(it.properties.osm_key)),
    );
    if (filtered.length === 0) {
      items = await photonSearch(q);
      filtered = items.filter((it) => it.properties.countrycode === 'tr');
    }
    const map = new Map<string, AsyncOption>();
    for (const it of filtered) {
      const p = it.properties;
      const name = p.name || p.street;
      if (!name) continue;
      const key = name.toLocaleLowerCase('tr');
      if (map.has(key)) continue;
      const short = [name, p.district || p.county, p.city]
        .filter(Boolean)
        .join(' · ');
      map.set(key, { label: name, value: name, sublabel: short });
    }
    return Array.from(map.values()).slice(0, 10);
  };
}
