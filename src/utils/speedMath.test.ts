import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistance,
  calculateFallbackSpeedKmh,
  msToKmh,
  kmhToMph,
  isFixAccurate,
  applySpeedThreshold,
  getAccuracyStatus,
  isGpsTimedOut,
  MAX_ACCEPTABLE_ACCURACY_METERS,
} from './speedMath';

test('msToKmh converts correctly', () => {
  assert.equal(msToKmh(0), 0);
  assert.equal(msToKmh(10), 36);
  assert.equal(msToKmh(27.77777777777778), 100);
  assert.equal(msToKmh(-5), 0);
  assert.equal(msToKmh(NaN), 0);
});

test('kmhToMph converts correctly', () => {
  assert.equal(kmhToMph(0), 0);
  assert.ok(Math.abs(kmhToMph(100) - 62.137) < 0.01);
  assert.equal(kmhToMph(-10), 0);
});

test('haversineDistance computes accurate earth surface distance', () => {
  // Distance between London (51.5074, -0.1278) and Paris (48.8566, 2.3522) ~ 343 km
  const dist = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
  assert.ok(dist > 340000 && dist < 345000);

  // 1 degree latitude delta ~ 111.19 km
  const latDelta = haversineDistance(0, 0, 1, 0);
  assert.ok(latDelta > 110000 && latDelta < 112000);

  // Identical point is 0
  assert.equal(haversineDistance(37.7749, -122.4194, 37.7749, -122.4194), 0);
});

test('calculateFallbackSpeedKmh calculates speed correctly from coordinates and delta-t', () => {
  // Move 100 meters north in 5 seconds -> 20 m/s = 72 km/h
  // 1 degree lat is ~ 111,195 m, so 100m is ~ 100 / 111195 = 0.0008993 deg
  const lat1 = 45.000000;
  const lat2 = 45.00089932;
  const lon = 9.000000;

  const prevFix = { latitude: lat1, longitude: lon, timestamp: 10000 };
  const currentFix = { latitude: lat2, longitude: lon, timestamp: 15000 };

  const speedKmh = calculateFallbackSpeedKmh(prevFix, currentFix);
  assert.ok(Math.abs(speedKmh - 72) < 1.0);

  // Stale fix > 30s returns 0
  const staleFix = { latitude: lat2, longitude: lon, timestamp: 50000 };
  assert.equal(calculateFallbackSpeedKmh(prevFix, staleFix), 0);

  // Inverted timestamp returns 0
  const backFix = { latitude: lat2, longitude: lon, timestamp: 5000 };
  assert.equal(calculateFallbackSpeedKmh(prevFix, backFix), 0);
});

test('isFixAccurate drops fixes exceeding 25m', () => {
  assert.equal(isFixAccurate(5), true);
  assert.equal(isFixAccurate(25), true);
  assert.equal(isFixAccurate(25.1), false);
  assert.equal(isFixAccurate(50), false);
  assert.equal(isFixAccurate(null), false);
  assert.equal(isFixAccurate(undefined), false);
  assert.equal(isFixAccurate(-1), false);
});

test('applySpeedThreshold displays 0 below 2 km/h', () => {
  assert.equal(applySpeedThreshold(0), 0);
  assert.equal(applySpeedThreshold(1.5), 0);
  assert.equal(applySpeedThreshold(1.99), 0);
  assert.equal(applySpeedThreshold(2.0), 2.0);
  assert.equal(applySpeedThreshold(50.4), 50.4);
});

test('getAccuracyStatus returns appropriate colors for thresholds', () => {
  assert.equal(getAccuracyStatus(null), 'red');
  assert.equal(getAccuracyStatus(undefined), 'red');
  assert.equal(getAccuracyStatus(30), 'red');
  assert.equal(getAccuracyStatus(25.1), 'red');
  assert.equal(getAccuracyStatus(20), 'yellow');
  assert.equal(getAccuracyStatus(11), 'yellow');
  assert.equal(getAccuracyStatus(10), 'green');
  assert.equal(getAccuracyStatus(3), 'green');
});

test('isGpsTimedOut detects 3s dropout accurately', () => {
  // Never received any fix yet
  assert.equal(isGpsTimedOut(null, 10000), true);

  // Recent fix (1000 ms ago)
  assert.equal(isGpsTimedOut(9000, 10000), false);

  // Fix 2999 ms ago
  assert.equal(isGpsTimedOut(7001, 10000), false);

  // Exactly 3000 ms ago -> timed out!
  assert.equal(isGpsTimedOut(7000, 10000), true);

  // Fix 4500 ms ago -> timed out!
  assert.equal(isGpsTimedOut(5500, 10000), true);
});
