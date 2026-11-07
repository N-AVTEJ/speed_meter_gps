import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistance,
  estimateFallbackSpeed,
  applyStationaryHysteresis,
  msToKmh,
  kmhToMph,
  isFixAccurate,
  applySpeedThreshold,
  getAccuracyStatus,
  isGpsTimedOut,
  shouldRejectSpeedJump,
  FallbackAnchor,
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
  const dist = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
  assert.ok(dist > 340000 && dist < 345000);

  const latDelta = haversineDistance(0, 0, 1, 0);
  assert.ok(latDelta > 110000 && latDelta < 112000);

  assert.equal(haversineDistance(37.7749, -122.4194, 37.7749, -122.4194), 0);
});

test('estimateFallbackSpeed: first fix returns null speed and anchors to fix', () => {
  const fix: FallbackAnchor = {
    latitude: 45.0,
    longitude: 9.0,
    timestamp: 10000,
    accuracy: 8,
  };
  const result = estimateFallbackSpeed(null, fix);
  assert.equal(result.speedKmh, null);
  assert.deepEqual(result.anchor, fix);
});

test('estimateFallbackSpeed: jitter inside circle never gives speed and gives 0 after 3 s with anchor unchanged', () => {
  const anchor: FallbackAnchor = {
    latitude: 45.0,
    longitude: 9.0,
    timestamp: 10000,
    accuracy: 10,
  };

  // Radius = max(6, 2 * max(10, 10)) = 20 meters.
  // Move 3 meters (inside 20m circle) at t = 1000ms -> dtMs = 1000 (< 3000ms)
  // 1 deg lat is ~111,195 m, so 3m is ~ 0.000027 deg
  const jitterFix1: FallbackAnchor = {
    latitude: 45.000027,
    longitude: 9.0,
    timestamp: 11000,
    accuracy: 10,
  };
  const res1 = estimateFallbackSpeed(anchor, jitterFix1);
  assert.equal(res1.speedKmh, null);
  assert.deepEqual(res1.anchor, anchor, 'Anchor must remain unchanged during jitter');

  // Another jitter inside circle at t = 2000ms -> dtMs = 2000 (< 3000ms)
  const jitterFix2: FallbackAnchor = {
    latitude: 45.0,
    longitude: 9.00003,
    timestamp: 12000,
    accuracy: 10,
  };
  const res2 = estimateFallbackSpeed(res1.anchor, jitterFix2);
  assert.equal(res2.speedKmh, null);
  assert.deepEqual(res2.anchor, anchor, 'Anchor must not drift with jitter');

  // Still inside circle at t = 13500ms -> dtMs = 3500 (>= 3000ms) -> confirms 0 km/h!
  const jitterFix3: FallbackAnchor = {
    latitude: 45.00001,
    longitude: 9.00001,
    timestamp: 13500,
    accuracy: 10,
  };
  const res3 = estimateFallbackSpeed(res2.anchor, jitterFix3);
  assert.equal(res3.speedKmh, 0, 'Stationary confirmed after 3 seconds');
  assert.deepEqual(res3.anchor, anchor, 'Anchor must still be kept');
});

test('estimateFallbackSpeed: 100 m north in 5 s = 72 km/h and anchor moves', () => {
  // Move 100 meters north in 5 seconds -> 20 m/s = 72 km/h
  // 1 degree lat is ~ 111,195 m, so 100m is ~ 100 / 111195 = 0.00089932 deg
  const anchor: FallbackAnchor = {
    latitude: 45.0,
    longitude: 9.0,
    timestamp: 10000,
    accuracy: 5,
  };

  const moveFix: FallbackAnchor = {
    latitude: 45.00089932,
    longitude: 9.0,
    timestamp: 15000,
    accuracy: 5,
  };

  const result = estimateFallbackSpeed(anchor, moveFix);
  assert.notEqual(result.speedKmh, null);
  assert.ok(Math.abs(result.speedKmh! - 72) < 1.0, `Expected ~72 km/h, got ${result.speedKmh}`);
  assert.deepEqual(result.anchor, moveFix, 'Anchor must update to new fix');
});

test('estimateFallbackSpeed: gap over 30 s resets anchor and returns null', () => {
  const anchor: FallbackAnchor = {
    latitude: 45.0,
    longitude: 9.0,
    timestamp: 10000,
    accuracy: 5,
  };
  const staleFix: FallbackAnchor = {
    latitude: 45.00089932,
    longitude: 9.0,
    timestamp: 45000, // 35s gap > 30s
    accuracy: 5,
  };

  const result = estimateFallbackSpeed(anchor, staleFix);
  assert.equal(result.speedKmh, null);
  assert.deepEqual(result.anchor, staleFix, 'Anchor should reset to the stale fix');
});

test('estimateFallbackSpeed: backwards time returns null and keeps anchor', () => {
  const anchor: FallbackAnchor = {
    latitude: 45.0,
    longitude: 9.0,
    timestamp: 10000,
    accuracy: 5,
  };
  const backwardsFix: FallbackAnchor = {
    latitude: 45.00089932,
    longitude: 9.0,
    timestamp: 9000, // -1000ms dt
    accuracy: 5,
  };

  const result = estimateFallbackSpeed(anchor, backwardsFix);
  assert.equal(result.speedKmh, null);
  assert.deepEqual(result.anchor, anchor);
});

test('applyStationaryHysteresis cases', () => {
  // 4.9 false -> 0 (below 5 km/h, transitions to stopped)
  const h1 = applyStationaryHysteresis(4.9, false);
  assert.equal(h1.displayKmh, 0);
  assert.equal(h1.stopped, true);

  // 5 false -> 5 (not < 5, remains moving)
  const h2 = applyStationaryHysteresis(5, false);
  assert.equal(h2.displayKmh, 5);
  assert.equal(h2.stopped, false);

  // 6 true -> 0 (<= 7, remains stopped)
  const h3 = applyStationaryHysteresis(6, true);
  assert.equal(h3.displayKmh, 0);
  assert.equal(h3.stopped, true);

  // 7 true -> 0 (<= 7, remains stopped)
  const h4 = applyStationaryHysteresis(7, true);
  assert.equal(h4.displayKmh, 0);
  assert.equal(h4.stopped, true);

  // 7.1 true -> 7.1 (> 7, transitions to moving)
  const h5 = applyStationaryHysteresis(7.1, true);
  assert.equal(h5.displayKmh, 7.1);
  assert.equal(h5.stopped, false);

  // NaN -> 0
  const h6 = applyStationaryHysteresis(NaN, false);
  assert.equal(h6.displayKmh, 0);
  assert.equal(h6.stopped, true);

  // Negative / Infinity
  const h7 = applyStationaryHysteresis(-2, false);
  assert.equal(h7.displayKmh, 0);
  assert.equal(h7.stopped, true);
  const h8 = applyStationaryHysteresis(Infinity, false);
  assert.equal(h8.displayKmh, 0);
  assert.equal(h8.stopped, true);
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
  assert.equal(isGpsTimedOut(null, 10000), true);
  assert.equal(isGpsTimedOut(9000, 10000), false);
  assert.equal(isGpsTimedOut(7001, 10000), false);
  assert.equal(isGpsTimedOut(7000, 10000), true);
  assert.equal(isGpsTimedOut(5500, 10000), true);
});

test('shouldRejectSpeedJump rejects jumps > 25 km/h versus previous accepted fix within 1 second', () => {
  assert.equal(shouldRejectSpeedJump(60, null, 500), false);
  assert.equal(shouldRejectSpeedJump(150, null, 200), false);

  assert.equal(shouldRejectSpeedJump(75, 50, 500), false);
  assert.equal(shouldRejectSpeedJump(25, 50, 500), false);
  assert.equal(shouldRejectSpeedJump(60, 50, 200), false);

  assert.equal(shouldRejectSpeedJump(76, 50, 500), true);
  assert.equal(shouldRejectSpeedJump(24, 50, 500), true);
  assert.equal(shouldRejectSpeedJump(120, 50, 800), true);
  assert.equal(shouldRejectSpeedJump(75.1, 50, 1000), true);

  assert.equal(shouldRejectSpeedJump(80, 50, 1050), false);
  assert.equal(shouldRejectSpeedJump(100, 50, 2000), false);
});
