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

test('SpeedKalmanFilter resets cleanly', () => {
  const kf = new SpeedKalmanFilter();
  kf.update(100);
  kf.reset(0);
  assert.equal(kf.getEstimate(), 0);
  const next = kf.update(15);
  assert.equal(next, 15);
});
