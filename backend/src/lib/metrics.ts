class MetricsCollector {
  private totalRequests = 0;
  private readonly startTime = Date.now();

  incrementRequests(): void {
    this.totalRequests++;
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getTotalRequests(): number {
    return this.totalRequests;
  }
}

export const metrics = new MetricsCollector();
