import { ApiError } from './errors';

/** Instance-wide counters only: no user IDs, IP address records or usage history. */
export class AdmissionControl {
  private active = 0;
  private windowStart = 0;
  private attempts = 0;
  constructor(
    private maxActive: number,
    private perMinute: number,
    private now: () => number = Date.now,
  ) {}
  acquire(): () => void {
    const now = this.now();
    if (now - this.windowStart >= 60000) {
      this.windowStart = now;
      this.attempts = 0;
    }
    if (++this.attempts > this.perMinute) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'The service request limit was reached. Try again shortly.',
        true,
      );
    }
    if (this.active >= this.maxActive) {
      throw new ApiError(503, 'BUSY', 'The service is busy. Please retry shortly.', true);
    }
    this.active++;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.active--;
      }
    };
  }
}
