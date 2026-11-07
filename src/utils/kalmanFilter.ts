/**
 * 1D Kalman Filter for Motorcycle Speedometer
 * Optimized for rapid acceleration responsiveness while rejecting road/engine vibration jitter.
 */

export interface KalmanFilterConfig {
  /**
    * Process noise covariance (Q):
    * High process noise allows rapid reaction to real throttle twist & hard braking.
    */
  processNoise: number;

  /**
    * Base measurement noise covariance (R):
    * Dampens micro-oscillations, vibration, and GPS multipath jitter.
    */
  measurementNoise: number;

  /**
    * Initial estimation error covariance (P).
    */
  initialError: number;
}

export const DEFAULT_SPEED_KALMAN_CONFIG: KalmanFilterConfig = {
  // Fairly high process noise so needle responds dynamically to swift motorcycle acceleration
  processNoise: 3.5,
  // Measurement noise dampens sensor jitter without introducing lagging drag
  measurementNoise: 1.5,
  initialError: 1.0,
};

export class SpeedKalmanFilter {
  private q: number;
  private r: number;
  private x: number; // estimated speed (km/h)
  private p: number; // estimation error covariance
  private isInitialized: boolean;

  constructor(config: Partial<KalmanFilterConfig> = {}) {
    const merged = { ...DEFAULT_SPEED_KALMAN_CONFIG, ...config };
    this.q = merged.processNoise;
    this.r = merged.measurementNoise;
    this.p = merged.initialError;
    this.x = 0;
    this.isInitialized = false;
  }

  /**
   * Updates filter state with a new raw speed measurement (km/h).
   * Optional accuracy (meters) can dynamically scale measurement noise R.
   */
  public update(measurement: number, accuracyMeters?: number): number {
    if (isNaN(measurement) || !isFinite(measurement)) {
      return this.x;
    }

    // Initialize with first real measurement
    if (!this.isInitialized) {
      this.x = Math.max(0, measurement);
      this.p = 1.0;
      this.isInitialized = true;
      return this.x;
    }

    // Dynamic R scaling: higher GPS error slightly increases measurement noise
    let effectiveR = this.r;
    if (accuracyMeters !== undefined && accuracyMeters > 0) {
      // Scales gracefully between 1.0x at 5m to 2.5x at 25m
      const scale = Math.min(3.0, Math.max(1.0, accuracyMeters / 10));
      effectiveR = this.r * scale;
    }

    const innovation = measurement - this.x;
    const q = Math.abs(innovation) > 15 ? this.q * 8 : this.q;

    // 1. Prediction step:
    // x_prior = x (constant velocity model between instantaneous GPS fixes)
    // p_prior = p + Q
    const pPrior = this.p + q;

    // 2. Innovation & Kalman Gain:
    // K = p_prior / (p_prior + R)
    const kGain = pPrior / (pPrior + effectiveR);

    // 3. Update estimate:
    // x = x + K * (z - x)
    this.x = this.x + kGain * (measurement - this.x);

    // 4. Update error covariance:
    // p = (1 - K) * p_prior
    this.p = (1 - kGain) * pPrior;

    // Speeds cannot be negative
    if (this.x < 0) {
      this.x = 0;
    }

    return this.x;
  }

  /**
   * Resets filter state (e.g. when signal is lost, GPS restarted, or app launch).
   * After reset, filter is marked uninitialized so the very next accepted fix's
   * measured speed seeds the filter directly rather than ramping from 0.
   */
  public reset(): void {
    this.x = 0;
    this.p = 1.0;
    this.isInitialized = false;
  }

  /**
   * Explicitly seeds filter with an initial speed measurement.
   */
  public seed(initialSpeed: number): void {
    this.x = Math.max(0, initialSpeed);
    this.p = 1.0;
    this.isInitialized = true;
  }

  /**
   * Checks if filter has already received its first seeding fix.
   */
  public isFilterInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Returns current estimated speed.
   */
  public getEstimate(): number {
    return this.x;
  }
}
