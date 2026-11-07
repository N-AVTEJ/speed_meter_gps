/**
 * GPS Speed & Geolocation Math for Apex Moto Speedo
 * Open Source, MIT License
 */

export interface GeoFix {
  latitude: number;
  longitude: number;
  timestamp: number; // ms epoch
}

export type AccuracyLevel = 'green' | 'yellow' | 'red';

export const MAX_ACCEPTABLE_ACCURACY_METERS = 25;
export const MIN_DISPLAY_SPEED_KMH = 2;
export const GAUGE_MAX_KMH = 200;
export const KMH_TO_MPH_FACTOR = 0.621371192237334;

/**
 * Calculate Haversine distance between two coordinates in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fallback speed calculation in km/h based on distance and elapsed time between GPS fixes.
 */
export function calculateFallbackSpeedKmh(
  prevFix: GeoFix,
  currentFix: GeoFix
): number {
  const timeElapsedSeconds = (currentFix.timestamp - prevFix.timestamp) / 1000;

  // Reject invalid, backwards, or excessively stale time gaps (> 30s)
  if (timeElapsedSeconds <= 0.05 || timeElapsedSeconds > 30) {
    return 0;
  }

  const distanceMeters = haversineDistance(
    prevFix.latitude,
    prevFix.longitude,
    currentFix.latitude,
    currentFix.longitude
  );

  const speedMps = distanceMeters / timeElapsedSeconds;
  return msToKmh(speedMps);
}

/**
 * Converts m/s to km/h.
 */
export function msToKmh(mps: number): number {
  if (mps < 0 || isNaN(mps) || !isFinite(mps)) return 0;
  return mps * 3.6;
}

/**
 * Converts km/h to mph.
 */
export function kmhToMph(kmh: number): number {
  if (kmh < 0 || isNaN(kmh) || !isFinite(kmh)) return 0;
  return kmh * KMH_TO_MPH_FACTOR;
}

/**
 * Checks if the GPS fix accuracy meets threshold (drops fixes > 25m).
 */
export function isFixAccurate(
  accuracy: number | null | undefined,
  maxAccuracy = MAX_ACCEPTABLE_ACCURACY_METERS
): boolean {
  if (accuracy === null || accuracy === undefined || isNaN(accuracy)) {
    return false;
  }
  return accuracy >= 0 && accuracy <= maxAccuracy;
}

/**
 * Applies speed threshold rules:
 * - Below 2 km/h, display 0.
 * - Negative or NaN speeds become 0.
 */
export function applySpeedThreshold(speedKmh: number): number {
  if (isNaN(speedKmh) || !isFinite(speedKmh) || speedKmh < MIN_DISPLAY_SPEED_KMH) {
    return 0;
  }
  return speedKmh;
}

/**
 * Determines GPS accuracy dot status:
 * - green: high accuracy (<= 10m)
 * - yellow: moderate accuracy (10m < accuracy <= 25m)
 * - red: poor accuracy (> 25m or null/no fix)
 */
export function getAccuracyStatus(
  accuracy: number | null | undefined
): AccuracyLevel {
  if (accuracy === null || accuracy === undefined || isNaN(accuracy) || accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
    return 'red';
  }
  if (accuracy <= 10) {
    return 'green';
  }
  return 'yellow';
}
