/**
 * GPS Speed & Geolocation Math for Apex Moto Speedo
 * Open Source, MIT License
 */

export interface GeoFix {
  latitude: number;
  longitude: number;
  timestamp: number; // ms epoch
}

export interface FallbackAnchor {
  latitude: number;
  longitude: number;
  timestamp: number; // ms
  accuracy: number; // m
}

export interface FallbackResult {
  speedKmh: number | null;
  anchor: FallbackAnchor;
}

export type AccuracyLevel = 'green' | 'yellow' | 'red';

export const MAX_ACCEPTABLE_ACCURACY_METERS = 25;
export const MIN_DISPLAY_SPEED_KMH = 2;
export const GAUGE_MAX_KMH = 200;
export const KMH_TO_MPH_FACTOR = 0.621371192237334;
export const GPS_TIMEOUT_MS = 3000;

export const FALLBACK_MIN_MOVE_METERS = 6;
export const FALLBACK_STILL_CONFIRM_MS = 3000;
export const FALLBACK_MAX_GAP_MS = 30000;

export const STOPPED_BELOW_KMH = 5;
export const MOVING_ABOVE_KMH = 7;

/**
 * Checks if GPS has timed out (no accepted fix for >= 3000 ms).
 */
export function isGpsTimedOut(
  lastAcceptedFixTime: number | null,
  currentTime: number,
  timeoutMs = GPS_TIMEOUT_MS
): boolean {
  if (lastAcceptedFixTime === null) {
    return true;
  }
  return currentTime - lastAcceptedFixTime >= timeoutMs;
}

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
 * Estimates fallback speed from coordinates when hardware Doppler speed is absent.
 * Uses an anchor point and an uncertainty radius to reject stationary jitter.
 */
export function estimateFallbackSpeed(
  anchor: FallbackAnchor | null,
  fix: FallbackAnchor
): FallbackResult {
  // - anchor null -> { speedKmh: null, anchor: fix }
  if (anchor === null) {
    return { speedKmh: null, anchor: fix };
  }

  // - dtMs = fix.timestamp - anchor.timestamp
  const dtMs = fix.timestamp - anchor.timestamp;

  // dtMs <= 0 -> { null, keep anchor }
  if (dtMs <= 0) {
    return { speedKmh: null, anchor };
  }

  // dtMs > 30000 -> { null, anchor: fix }
  if (dtMs > FALLBACK_MAX_GAP_MS) {
    return { speedKmh: null, anchor: fix };
  }

  // - distance = haversineDistance(anchor, fix)
  //   radius = max(6, 2 * max(anchor.accuracy, fix.accuracy))
  const distance = haversineDistance(
    anchor.latitude,
    anchor.longitude,
    fix.latitude,
    fix.longitude
  );
  const radius = Math.max(
    FALLBACK_MIN_MOVE_METERS,
    2 * Math.max(anchor.accuracy, fix.accuracy)
  );

  // - distance <= radius -> speedKmh = (dtMs >= 3000 ? 0 : null), KEEP the same anchor (it must not drift)
  if (distance <= radius) {
    const speedKmh = dtMs >= FALLBACK_STILL_CONFIRM_MS ? 0 : null;
    return { speedKmh, anchor };
  }

  // - distance > radius -> speedKmh = msToKmh(distance / (dtMs/1000)), anchor = fix
  const speedMps = distance / (dtMs / 1000);
  return {
    speedKmh: msToKmh(speedMps),
    anchor: fix,
  };
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
 * Applies stationary hysteresis to eliminate low-speed jitter while stopped:
 * - NaN / infinite / negative -> { displayKmh: 0, stopped: true }
 * - stopped = wasStopped ? speed <= 7 : speed < 5
 * - displayKmh = stopped ? 0 : speedKmh
 */
export function applyStationaryHysteresis(
  speedKmh: number,
  wasStopped: boolean
): { displayKmh: number; stopped: boolean } {
  if (isNaN(speedKmh) || !isFinite(speedKmh) || speedKmh < 0) {
    return { displayKmh: 0, stopped: true };
  }

  const stopped = wasStopped
    ? speedKmh <= MOVING_ABOVE_KMH
    : speedKmh < STOPPED_BELOW_KMH;

  return {
    displayKmh: stopped ? 0 : speedKmh,
    stopped,
  };
}

/**
 * Legacy speed threshold function (used by simulation mode):
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
  if (
    accuracy === null ||
    accuracy === undefined ||
    isNaN(accuracy) ||
    accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
  ) {
    return 'red';
  }
  if (accuracy <= 10) {
    return 'green';
  }
  return 'yellow';
}

export const MAX_SPEED_JUMP_KMH = 25;
export const SPEED_JUMP_MAX_TIME_DELTA_MS = 1000;

/**
 * Rejects any accepted fix where speed jumps more than 25 km/h versus
 * the previous accepted fix within 1 second.
 */
export function shouldRejectSpeedJump(
  currentSpeedKmh: number,
  prevAcceptedSpeedKmh: number | null,
  timeDeltaMs: number,
  maxJumpKmh = MAX_SPEED_JUMP_KMH,
  maxTimeDeltaMs = SPEED_JUMP_MAX_TIME_DELTA_MS
): boolean {
  if (prevAcceptedSpeedKmh === null) {
    return false;
  }
  if (timeDeltaMs < 0 || timeDeltaMs > maxTimeDeltaMs) {
    return false;
  }
  const speedDifference = Math.abs(currentSpeedKmh - prevAcceptedSpeedKmh);
  return speedDifference > maxJumpKmh;
}
