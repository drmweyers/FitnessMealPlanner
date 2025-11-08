/**
 * BMAD Image Generation Monitoring Service
 * Detects and alerts on silent image generation failures
 */

export interface ImageGenerationAlert {
  severity: 'warning' | 'error' | 'critical';
  message: string;
  batchId: string;
  timestamp: Date;
  metrics: {
    recipesGenerated: number;
    imagesGenerated: number;
    imagesUploaded: number;
    placeholderCount: number;
  };
}

export class BMADImageGenerationMonitor {
  private alerts: ImageGenerationAlert[] = [];
  private readonly MAX_ALERT_HISTORY = 100;

  /**
   * Check if image generation is failing silently
   */
  checkImageGenerationHealth(
    batchId: string,
    recipesGenerated: number,
    imagesGenerated: number,
    imagesUploaded: number,
    placeholderCount: number
  ): ImageGenerationAlert | null {
    const metrics = {
      recipesGenerated,
      imagesGenerated,
      imagesUploaded,
      placeholderCount
    };

    // Critical: Zero images generated when recipes were created
    if (recipesGenerated > 0 && imagesGenerated === 0) {
      return this.createAlert(
        'critical',
        `CRITICAL: Zero images generated for ${recipesGenerated} recipes. Image generation pipeline completely failed.`,
        batchId,
        metrics
      );
    }

    // Error: More than 50% placeholders
    if (recipesGenerated > 0 && placeholderCount / recipesGenerated > 0.5) {
      return this.createAlert(
        'error',
        `ERROR: ${placeholderCount}/${recipesGenerated} recipes (${((placeholderCount / recipesGenerated) * 100).toFixed(1)}%) using placeholders. DALL-E API may be down.`,
        batchId,
        metrics
      );
    }

    // Warning: Images generated but not uploaded
    if (imagesGenerated > 0 && imagesUploaded === 0) {
      return this.createAlert(
        'warning',
        `WARNING: ${imagesGenerated} images generated but zero uploaded to S3. S3 upload pipeline failed.`,
        batchId,
        metrics
      );
    }

    // Warning: Partial S3 upload failures
    if (imagesGenerated > 0 && imagesUploaded < imagesGenerated * 0.8) {
      return this.createAlert(
        'warning',
        `WARNING: Only ${imagesUploaded}/${imagesGenerated} images uploaded to S3 (${((imagesUploaded / imagesGenerated) * 100).toFixed(1)}%). S3 connection unstable.`,
        batchId,
        metrics
      );
    }

    // Success case
    if (imagesGenerated > 0 && imagesUploaded === imagesGenerated) {
      console.log(`[Monitor] ✅ Batch ${batchId}: ${imagesGenerated} images generated and uploaded successfully`);
    }

    return null;
  }

  /**
   * Create and store alert
   */
  private createAlert(
    severity: 'warning' | 'error' | 'critical',
    message: string,
    batchId: string,
    metrics: ImageGenerationAlert['metrics']
  ): ImageGenerationAlert {
    const alert: ImageGenerationAlert = {
      severity,
      message,
      batchId,
      timestamp: new Date(),
      metrics
    };

    this.alerts.push(alert);

    // Trim alert history
    if (this.alerts.length > this.MAX_ALERT_HISTORY) {
      this.alerts = this.alerts.slice(-this.MAX_ALERT_HISTORY);
    }

    // Log to console with appropriate level
    this.logAlert(alert);

    return alert;
  }

  /**
   * Log alert to console with color coding
   */
  private logAlert(alert: ImageGenerationAlert): void {
    const prefix = alert.severity === 'critical' ? '🚨' : alert.severity === 'error' ? '❌' : '⚠️';

    console.log(`[Monitor] ${prefix} ${alert.severity.toUpperCase()}: ${alert.message}`);
    console.log(`[Monitor] Batch ID: ${alert.batchId}`);
    console.log(`[Monitor] Metrics:`, alert.metrics);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): ImageGenerationAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get critical alerts (for immediate attention)
   */
  getCriticalAlerts(): ImageGenerationAlert[] {
    return this.alerts.filter(a => a.severity === 'critical');
  }

  /**
   * Clear alert history
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get health score (0-100)
   */
  getHealthScore(
    recipesGenerated: number,
    imagesGenerated: number,
    imagesUploaded: number,
    placeholderCount: number
  ): number {
    if (recipesGenerated === 0) return 100; // No recipes = no issues

    let score = 100;

    // Deduct points for missing images
    const imageGenerationRate = imagesGenerated / recipesGenerated;
    if (imageGenerationRate < 1) {
      score -= (1 - imageGenerationRate) * 50; // Up to -50 points
    }

    // Deduct points for placeholders
    const placeholderRate = placeholderCount / recipesGenerated;
    if (placeholderRate > 0) {
      score -= placeholderRate * 30; // Up to -30 points
    }

    // Deduct points for S3 upload failures
    if (imagesGenerated > 0) {
      const uploadRate = imagesUploaded / imagesGenerated;
      if (uploadRate < 1) {
        score -= (1 - uploadRate) * 20; // Up to -20 points
      }
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Get comprehensive health report
   */
  getHealthReport(
    batchId: string,
    recipesGenerated: number,
    imagesGenerated: number,
    imagesUploaded: number,
    placeholderCount: number
  ): {
    batchId: string;
    healthScore: number;
    status: 'healthy' | 'degraded' | 'critical';
    alert: ImageGenerationAlert | null;
    recommendations: string[];
  } {
    const healthScore = this.getHealthScore(
      recipesGenerated,
      imagesGenerated,
      imagesUploaded,
      placeholderCount
    );

    const alert = this.checkImageGenerationHealth(
      batchId,
      recipesGenerated,
      imagesGenerated,
      imagesUploaded,
      placeholderCount
    );

    const status =
      healthScore >= 80 ? 'healthy' :
      healthScore >= 50 ? 'degraded' :
      'critical';

    const recommendations: string[] = [];

    if (imagesGenerated === 0 && recipesGenerated > 0) {
      recommendations.push('Check DALL-E API credentials and quota');
      recommendations.push('Verify OpenAI API key is valid and has credits');
      recommendations.push('Check network connectivity to OpenAI API');
    }

    if (placeholderCount > 0) {
      recommendations.push('DALL-E API may be rate-limited or down');
      recommendations.push('Check OpenAI service status: https://status.openai.com');
    }

    if (imagesGenerated > 0 && imagesUploaded === 0) {
      recommendations.push('Check S3/DigitalOcean Spaces credentials');
      recommendations.push('Verify S3 bucket permissions and access keys');
      recommendations.push('Check network connectivity to S3');
    }

    if (imagesGenerated > 0 && imagesUploaded < imagesGenerated) {
      recommendations.push('S3 connection may be unstable');
      recommendations.push('Consider increasing S3 upload timeout');
    }

    return {
      batchId,
      healthScore,
      status,
      alert,
      recommendations
    };
  }

  /**
   * Monitor a BMAD generation result
   */
  monitorGenerationResult(result: {
    batchId: string;
    savedRecipes: any[];
    imagesGenerated: number;
    imagesUploaded: number;
    nutritionValidationStats?: {
      validated: number;
      autoFixed: number;
      failed: number;
    };
  }): {
    healthScore: number;
    status: 'healthy' | 'degraded' | 'critical';
    alert: ImageGenerationAlert | null;
  } {
    const recipesGenerated = result.savedRecipes.length;
    const imagesGenerated = result.imagesGenerated;
    const imagesUploaded = result.imagesUploaded;
    const placeholderCount = recipesGenerated - imagesGenerated;

    const report = this.getHealthReport(
      result.batchId,
      recipesGenerated,
      imagesGenerated,
      imagesUploaded,
      placeholderCount
    );

    // Log health report
    console.log(`[Monitor] Health Report for Batch ${result.batchId}:`);
    console.log(`[Monitor] Health Score: ${report.healthScore}/100`);
    console.log(`[Monitor] Status: ${report.status}`);

    if (report.recommendations.length > 0) {
      console.log(`[Monitor] Recommendations:`);
      report.recommendations.forEach(rec => console.log(`[Monitor]   - ${rec}`));
    }

    return {
      healthScore: report.healthScore,
      status: report.status,
      alert: report.alert
    };
  }
}

// Export singleton instance
export const bmadImageMonitor = new BMADImageGenerationMonitor();
