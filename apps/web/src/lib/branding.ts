'use client';

import { useEffect, useState } from 'react';
import { apiGet } from './api';

export interface Branding {
  siteName: string;
  siteTagline: string;
  logoHeaderUrl: string;
  logoFooterUrl: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
}

const DEFAULT: Branding = {
  siteName: 'Servis Platform',
  siteTagline: 'Okul Servisi Marketi',
  logoHeaderUrl: '',
  logoFooterUrl: '',
  supportEmail: '',
  supportPhone: '',
  address: '',
};

let cache: Branding | null = null;
let inflight: Promise<Branding> | null = null;

async function fetchBranding(): Promise<Branding> {
  if (cache) return cache;
  if (!inflight) {
    inflight = apiGet<Branding>('/public-settings/branding')
      .then((b) => {
        cache = { ...DEFAULT, ...b };
        return cache;
      })
      .catch(() => {
        cache = DEFAULT;
        return DEFAULT;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useBranding(): Branding {
  const [b, setB] = useState<Branding>(cache ?? DEFAULT);
  useEffect(() => {
    fetchBranding().then(setB);
  }, []);
  return b;
}
