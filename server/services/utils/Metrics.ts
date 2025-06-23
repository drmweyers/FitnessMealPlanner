export interface GenerationMetrics {
  totalGenerated: number;
  successRate: number;
  averageGenerationTime: number;
  errorRates: Map<string, number>;
  lastUpdated: Date;
}

export class RecipeGenerationMetrics {
  private metrics: GenerationMetrics = {
    totalGenerated: 0,
    successRate: 0,
    averageGenerationTime: 0,
    errorRates: new Map<string, number>(),
    lastUpdated: new Date()
  };

  recordGeneration(duration: number, success: boolean, errorType?: string): void {
    this.metrics.totalGenerated++;
    this.metrics.averageGenerationTime = 
      (this.metrics.averageGenerationTime * (this.metrics.totalGenerated - 1) + duration) 
      / this.metrics.totalGenerated;
    
    // Update success rate
    const totalSuccess = this.metrics.successRate * (this.metrics.totalGenerated - 1) + (success ? 1 : 0);
    this.metrics.successRate = totalSuccess / this.metrics.totalGenerated;
    
    if (!success && errorType) {
      const currentCount = this.metrics.errorRates.get(errorType) || 0;
      this.metrics.errorRates.set(errorType, currentCount + 1);
    }

    this.metrics.lastUpdated = new Date();
  }

  getMetrics(): GenerationMetrics {
    return { ...this.metrics, errorRates: new Map(this.metrics.errorRates) };
  }

  reset(): void {
    this.metrics = {
      totalGenerated: 0,
      successRate: 0,
      averageGenerationTime: 0,
      errorRates: new Map<string, number>(),
      lastUpdated: new Date()
    };
  }

  getErrorSummary(): { errorType: string; count: number }[] {
    return Array.from(this.metrics.errorRates.entries()).map(([errorType, count]) => ({
      errorType,
      count
    }));
  }
} 