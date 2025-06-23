export class OpenAIRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsThisMinute = 0;
  private lastReset = Date.now();
  private readonly RATE_LIMIT = 50; // requests per minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      if (this.shouldThrottle()) {
        await this.delay(1000);
        continue;
      }

      const task = this.queue.shift();
      if (task) {
        this.requestsThisMinute++;
        await task();
      }
    }

    this.processing = false;
  }

  private shouldThrottle(): boolean {
    const now = Date.now();
    if (now - this.lastReset >= 60000) {
      this.requestsThisMinute = 0;
      this.lastReset = now;
    }
    return this.requestsThisMinute >= this.RATE_LIMIT;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 