import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../theme/colors';

interface Point {
  latitude: number;
  longitude: number;
}

interface Props {
  home: Point;
  school: Point & { name?: string };
  distanceKm?: number | null;
  etaMin?: number | null;
  height?: number;
}

/**
 * Küçük yol haritası: ev + okul marker'ları + OSRM public route polyline.
 * OSRM public API çağrısı client-side (mobile) yapılır, key gerekmez.
 * iOS = Apple Maps (native), Android = Google Maps (requires GOOGLE_MAPS_API_KEY in Info.plist).
 */
export function RouteMap({ home, school, distanceKm, etaMin, height = 160 }: Props) {
  const [route, setRoute] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // OSRM public routing (best-effort — timeout 3s)
        const url = `https://router.project-osrm.org/route/v1/driving/${home.longitude},${home.latitude};${school.longitude},${school.latitude}?geometries=geojson&overview=simplified`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('OSRM failed');
        const data = await res.json();
        if (cancelled) return;
        const coords = data?.routes?.[0]?.geometry?.coordinates as Array<[number, number]> | undefined;
        if (coords && coords.length > 0) {
          setRoute(coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
        } else {
          setRoute([home, school]); // fallback düz çizgi
        }
      } catch {
        if (cancelled) return;
        setRoute([home, school]); // fallback
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [home.latitude, home.longitude, school.latitude, school.longitude]);

  const region = useMemo(() => {
    const latDelta = Math.max(0.01, Math.abs(home.latitude - school.latitude) * 2.4);
    const lngDelta = Math.max(0.01, Math.abs(home.longitude - school.longitude) * 2.4);
    return {
      latitude: (home.latitude + school.latitude) / 2,
      longitude: (home.longitude + school.longitude) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [home, school]);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        pointerEvents="none"
        showsCompass={false}
        showsMyLocationButton={false}
        loadingEnabled
      >
        {route && route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor={colors.primaryDark}
            strokeWidth={4}
          />
        )}
        <Marker coordinate={home}>
          <View style={styles.markerHome}>
            <Text style={styles.markerText}>🏠</Text>
          </View>
        </Marker>
        <Marker coordinate={school}>
          <View style={styles.markerSchool}>
            <Text style={styles.markerText}>🏫</Text>
          </View>
        </Marker>
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.dark} />
        </View>
      )}

      {distanceKm != null && etaMin != null && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{distanceKm} km · {etaMin} dk</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EBF3EB',
    marginBottom: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  markerHome: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerSchool: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: { fontSize: 14 },
  badge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: colors.dark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
