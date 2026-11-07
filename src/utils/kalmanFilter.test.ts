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

test('SpeedKalmanFilter: smoothing jitter with processNoise 2.5 and measurementNoise 4 ends below 4', () => {
  const kf = new SpeedKalmanFilter({ processNoise: 2.5, measurementNoise: 4 });
  kf.update(0);

  const jitterSeq = [5, 1, 6, 0, 4, 2, 6, 1, 5, 0, 4, 3];
  let result = 0;
  for (const val of jitterSeq) {
    result = kf.update(val, 12);
  }

  assert.ok(result < 4, `Expected final smoothed estimate below 4, got ${result}`);
});

test('SpeedKalmanFilter: processNoise 2.5 and measurementNoise 4 accelerates 0 -> 40 > 25 and 80 > 60', () => {
  const kf = new SpeedKalmanFilter({ processNoise: 2.5, measurementNoise: 4 });
  kf.update(0);

  const step1 = kf.update(40);
  assert.ok(step1 > 25, `Expected step1 > 25, got ${step1}`);

  const step2 = kf.update(80);
  assert.ok(step2 > 60, `Expected step2 > 60, got ${step2}`);
});

test('SpeedKalmanFilter seeds with first accepted fix measured speed at app launch, not 0', () => {
  const kf = new SpeedKalmanFilter();
  assert.equal(kf.isFilterInitialized(), false);
  const initialEstimate = kf.update(85);
  assert.equal(initialEstimate, 85);
  assert.equal(kf.getEstimate(), 85);
  assert.equal(kf.isFilterInitialized(), true);
});

test('SpeedKalmanFilter seeds with first accepted fix measured speed after any reset, not 0', () => {
  const kf = new SpeedKalmanFilter();
  kf.update(50);
  kf.update(55);

  kf.reset();
  assert.equal(kf.isFilterInitialized(), false);

  const afterResetEstimate = kf.update(95);
  assert.equal(afterResetEstimate, 95);
  assert.equal(kf.getEstimate(), 95);
  assert.equal(kf.isFilterInitialized(), true);
});
