import test from 'node:test';
import assert from 'node:assert/strict';
import { SpeedKalmanFilter } from './kalmanFilter';

test('SpeedKalmanFilter initializes on first measurement', () => {
  const kf = new SpeedKalmanFilter();
  const speed = kf.update(45);
  assert.equal(speed, 45);
  assert.equal(kf.getEstimate(), 45);
});

test('SpeedKalmanFilter dampens sensor vibration noise while tracking acceleration', () => {
  const kf = new SpeedKalmanFilter({ processNoise: 3.5, measurementNoise: 1.5 });
  kf.update(50); // initial

  // Introduce small oscillating vibration around 50 (+-2 km/h jitter)
  const noisyInputs = [52, 48, 51.5, 48.5, 52, 49];
  let lastFiltered = 50;
  for (const raw of noisyInputs) {
    lastFiltered = kf.update(raw);
  }

  // Filtered speed stays stable close to true 50 km/h
  assert.ok(Math.abs(lastFiltered - 50) < 1.5, `Filtered ${lastFiltered} deviated too much from true mean`);
});

test('SpeedKalmanFilter reacts rapidly to throttle acceleration', () => {
  const kf = new SpeedKalmanFilter({ processNoise: 3.5, measurementNoise: 1.5 });
  kf.update(0);

  // Fast acceleration burst: 0 -> 40 -> 80 -> 120
  const step1 = kf.update(40);
  assert.ok(step1 > 25, `Expected fast pickup, got ${step1}`);

  const step2 = kf.update(80);
  assert.ok(step2 > 60, `Expected strong tracking on step 2, got ${step2}`);

  const step3 = kf.update(120);
  assert.ok(step3 > 100, `Expected tracking close to target on step 3, got ${step3}`);
});

test('SpeedKalmanFilter seeds with first accepted fix measured speed at app launch, not 0', () => {
  const kf = new SpeedKalmanFilter();
  assert.equal(kf.isFilterInitialized(), false);
  // Rider launches app while already cruising at 85 km/h
  const initialEstimate = kf.update(85);
  assert.equal(initialEstimate, 85);
  assert.equal(kf.getEstimate(), 85);
  assert.equal(kf.isFilterInitialized(), true);
});

test('SpeedKalmanFilter seeds with first accepted fix measured speed after any reset, not 0', () => {
  const kf = new SpeedKalmanFilter();
  kf.update(50);
  kf.update(55);

  // GPS lost / signal reset occurs
  kf.reset();
  assert.equal(kf.isFilterInitialized(), false);

  // First accepted fix after reset arrives at 95 km/h (e.g. exiting tunnel)
  const afterResetEstimate = kf.update(95);
  // Must be seeded directly with 95 km/h, not interpolated from 0
  assert.equal(afterResetEstimate, 95);
  assert.equal(kf.getEstimate(), 95);
  assert.equal(kf.isFilterInitialized(), true);
});
