/**
 * BMAD Core - Main Integration Module
 * Central orchestrator for all BMAD components
 */

import { EventEmitter } from 'events';
import { BusinessStrategyEngine, businessStrategy } from './strategy/BusinessStrategyEngine';
import { CustomerIntelligence, customerIntelligence } from './intelligence/CustomerIntelligence';
import { WorkflowEngine, workflowEngine } from './automation/WorkflowEngine';

export interface BMADConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  analytics?: {
    enabled: boolean;
    trackingId?: string;
  };
  monitoring?: {
    interval: number; // milliseconds
    metrics: string[];
  };
}

export interface BMADMetrics {
  strategy: {
    recommendations: number;
    metrics: any;
  };
  intelligence: {
    customersAnalyzed: number;
    segments: Map<string, number>;
    avgEngagementScore: number;
  };
  automation: {
    workflowsActive: number;
    executionsToday: number;
    successRate: number;
  };
  overall: {
    healthScore: number; // 0-100
    alerts: string[];
    opportunities: string[];
  };
}

export class BMADCore extends EventEmitter {
  private config: BMADConfig;
  private strategyEngine: BusinessStrategyEngine;
  private customerIntel: CustomerIntelligence;
  private workflowEngine: WorkflowEngine;
  private monitoringInterval?: NodeJS.Timeout;
  private metrics: BMADMetrics;
  
  constructor(config: BMADConfig = {}) {
    super();
    this.config = config;
    this.strategyEngine = businessStrategy;
    this.customerIntel = customerIntelligence;
    this.workflowEngine = workflowEngine;
    
    this.metrics = this.initializeMetrics();
    this.setupEventListeners();
  }

  private initializeMetrics(): BMADMetrics {
    return {
      strategy: {
        recommendations: 0,
        metrics: {}
      },
      intelligence: {
        customersAnalyzed: 0,
        segments: new Map(),
        avgEngagementScore: 0
      },
      automation: {
        workflowsActive: 0,
        executionsToday: 0,
        successRate: 0
      },
      overall: {
        healthScore: 100,
        alerts: [],
        opportunities: []
      }
    };
  }

  private setupEventListeners(): void {
    // Strategy Engine Events
    this.strategyEngine.on('strategy-analysis-complete', (recommendations) => {
      this.metrics.strategy.recommendations = recommendations.length;
      this.evaluateOpportunities(recommendations);
    });

    this.strategyEngine.on('metrics-updated', (metrics) => {
      this.metrics.strategy.metrics = metrics;
      this.calculateHealthScore();
    });

    // Customer Intelligence Events
    this.customerIntel.on('customer-analyzed', (profile) => {
      this.metrics.intelligence.customersAnalyzed++;
      this.updateIntelligenceMetrics();
    });

    this.customerIntel.on('customer-segmented', ({ customerId, segmentId }) => {
      const count = this.metrics.intelligence.segments.get(segmentId) || 0;
      this.metrics.intelligence.segments.set(segmentId, count + 1);
    });

    // Workflow Engine Events
    this.workflowEngine.on('workflow-completed', (execution) => {
      this.metrics.automation.executionsToday++;
      this.updateAutomationMetrics();
    });

    this.workflowEngine.on('workflow-failed', (execution) => {
      this.metrics.overall.alerts.push(`Workflow ${execution.workflowId} failed: ${execution.error}`);
    });

    // Cross-component events
    this.setupCrossComponentIntegration();
  }

  private setupCrossComponentIntegration(): void {
    // When customer is at risk, trigger retention workflow
    this.customerIntel.on('customer-analyzed', async (profile) => {
      if (profile.engagement.riskLevel === 'high') {
        await this.workflowEngine.executeWorkflow('churn-prevention', { 
          customerId: profile.id,
          profile 
        });
      }
    });

    // When strategy identifies opportunity, create workflow
    this.strategyEngine.on('strategy-analysis-complete', async (recommendations) => {
      for (const rec of recommendations) {
        if (rec.priority === 'critical' && rec.confidence > 0.8) {
          // Dynamically create and execute workflow for critical recommendations
          this.createRecommendationWorkflow(rec);
        }
      }
    });

    // Workflow outcomes affect business metrics
    this.workflowEngine.on('workflow-completed', (execution) => {
      if (execution.workflowId === 'upsell-opportunity' && execution.status === 'completed') {
        // Update strategy metrics based on successful upsell
        this.strategyEngine.updateMetrics({
          revenue: {
            mrr: this.metrics.strategy.metrics.revenue?.mrr * 1.05 || 0,
            arr: this.metrics.strategy.metrics.revenue?.arr * 1.05 || 0,
            growthRate: 0.05,
            churnRate: this.metrics.strategy.metrics.revenue?.churnRate || 0,
            ltv: this.metrics.strategy.metrics.revenue?.ltv || 0,
            cac: this.metrics.strategy.metrics.revenue?.cac || 0
          },
          users: this.metrics.strategy.metrics.users,
          engagement: this.metrics.strategy.metrics.engagement,
          operational: this.metrics.strategy.metrics.operational
        });
      }
    });
  }

  private createRecommendationWorkflow(recommendation: any): void {
    const workflow = {
      id: `rec-${recommendation.id}`,
      name: `Automated: ${recommendation.title}`,
      description: recommendation.description,
      trigger: { type: 'manual' as const },
      conditions: [],
      actions: this.generateRecommendationActions(recommendation),
      enabled: true,
      priority: recommendation.priority === 'critical' ? 1 : 2,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
        successRate: 1.0,
        lastExecuted: undefined
      }
    };
    
    this.workflowEngine.addWorkflow(workflow);
    this.workflowEngine.executeWorkflow(workflow.id, { recommendation });
  }

  private generateRecommendationActions(recommendation: any): any[] {
    const actions = [];
    
    switch (recommendation.type) {
      case 'pricing':
        actions.push({
          id: 'update-pricing',
          type: 'updateData',
          config: {
            field: 'pricing.strategy',
            value: recommendation.expectedImpact
          }
        });
        actions.push({
          id: 'notify-users',
          type: 'email',
          config: {
            template: 'pricing-update',
            segment: 'all-users'
          }
        });
        break;
        
      case 'feature':
        actions.push({
          id: 'enable-feature',
          type: 'updateData',
          config: {
            field: 'features.enabled',
            value: recommendation.title
          }
        });
        actions.push({
          id: 'announce-feature',
          type: 'notification',
          config: {
            type: 'in-app',
            message: `New feature available: ${recommendation.title}`
          }
        });
        break;
        
      case 'marketing':
        actions.push({
          id: 'launch-campaign',
          type: 'workflow',
          config: {
            workflowId: 'marketing-campaign',
            params: recommendation.expectedImpact
          }
        });
        break;
        
      case 'operational':
        actions.push({
          id: 'optimize-operations',
          type: 'apiCall',
          config: {
            endpoint: '/api/operations/optimize',
            method: 'POST',
            body: recommendation.implementation
          }
        });
        break;
    }
    
    // Add tracking for all recommendations
    actions.push({
      id: 'track-implementation',
      type: 'analytics',
      config: {
        event: 'recommendation.implemented',
        properties: {
          recommendationId: recommendation.id,
          type: recommendation.type,
          expectedImpact: recommendation.expectedImpact
        }
      }
    });
    
    return actions;
  }

  private evaluateOpportunities(recommendations: any[]): void {
    this.metrics.overall.opportunities = recommendations
      .filter(r => r.confidence > 0.7)
      .map(r => `${r.title} (Impact: ${JSON.stringify(r.expectedImpact)})`);
  }

  private calculateHealthScore(): void {
    let score = 100;
    const { metrics } = this.metrics.strategy;
    
    if (!metrics || !metrics.revenue) {
      this.metrics.overall.healthScore = 50;
      return;
    }
    
    // Revenue health (30 points)
    if (metrics.revenue.churnRate > 0.05) score -= 10;
    if (metrics.revenue.growthRate < 0.05) score -= 10;
    if (metrics.revenue.ltv / metrics.revenue.cac < 3) score -= 10;
    
    // User health (30 points)
    if (metrics.users) {
      const activeRate = metrics.users.active / metrics.users.total;
      if (activeRate < 0.6) score -= 15;
      if (metrics.users.churn > metrics.users.new) score -= 15;
    }
    
    // Engagement health (20 points)
    if (metrics.engagement) {
      const stickiness = metrics.engagement.dau / metrics.engagement.mau;
      if (stickiness < 0.15) score -= 10;
      if (metrics.engagement.sessionDuration < 10) score -= 10;
    }
    
    // Operational health (20 points)
    if (metrics.operational) {
      if (metrics.operational.costPerUser > 10) score -= 10;
      if (metrics.operational.responseTime > 24) score -= 10;
    }
    
    this.metrics.overall.healthScore = Math.max(score, 0);
    
    // Generate alerts based on health score
    if (this.metrics.overall.healthScore < 70) {
      this.metrics.overall.alerts.push('Business health score below threshold');
    }
  }

  private updateIntelligenceMetrics(): void {
    // Calculate average engagement score
    // In production, this would aggregate from actual customer data
    this.metrics.intelligence.avgEngagementScore = 65; // Placeholder
  }

  private updateAutomationMetrics(): void {
    // Calculate success rate for today's executions
    // In production, this would query actual execution history
    this.metrics.automation.successRate = 0.85; // Placeholder
  }

  /**
   * Initialize BMAD Core and start all components
   */
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing BMAD Core...');
    
    // Start strategy monitoring
    this.strategyEngine.startMonitoring(this.config.monitoring?.interval || 3600000);
    
    // Start monitoring
    if (this.config.monitoring?.enabled !== false) {
      this.startMonitoring();
    }
    
    // Initial analysis
    await this.strategyEngine.analyzeBusinessStrategy();
    
    this.emit('initialized');
    console.log('✅ BMAD Core initialized successfully');
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    const interval = this.config.monitoring?.interval || 60000; // Default 1 minute
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.emit('metrics-collected', this.metrics);
      
      // Check for alerts
      if (this.metrics.overall.alerts.length > 0) {
        this.emit('alerts', this.metrics.overall.alerts);
      }
      
      // Check health score
      if (this.metrics.overall.healthScore < 70) {
        this.emit('health-warning', this.metrics.overall.healthScore);
      }
    }, interval);
  }

  /**
   * Collect current metrics from all components
   */
  private collectMetrics(): void {
    // This would collect real metrics from the database and services
    // For now, using the current state
    this.calculateHealthScore();
  }

  /**
   * Get current BMAD metrics
   */
  public getMetrics(): BMADMetrics {
    return this.metrics;
  }

  /**
   * Execute a strategic analysis
   */
  public async analyzeStrategy(): Promise<any> {
    return await this.strategyEngine.analyzeBusinessStrategy();
  }

  /**
   * Analyze a specific customer
   */
  public analyzeCustomer(customerId: string, data: any): any {
    return this.customerIntel.analyzeCustomer(customerId, data);
  }

  /**
   * Execute a workflow
   */
  public async executeWorkflow(workflowId: string, input: any): Promise<any> {
    return await this.workflowEngine.executeWorkflow(workflowId, input);
  }

  /**
   * Get recommendations for business optimization
   */
  public async getRecommendations(): Promise<any[]> {
    const strategicRecs = await this.strategyEngine.analyzeBusinessStrategy();
    
    // Combine with customer intelligence insights
    const customerInsights = Array.from(this.metrics.intelligence.segments.entries())
      .map(([segmentId, count]) => ({
        id: `seg-${segmentId}`,
        type: 'segment',
        priority: count > 100 ? 'high' : 'medium',
        title: `Optimize for ${segmentId} segment`,
        description: `${count} customers in this segment present optimization opportunity`,
        confidence: 0.7
      }));
    
    return [...strategicRecs, ...customerInsights];
  }

  /**
   * Shutdown BMAD Core
   */
  public shutdown(): void {
    console.log('🔄 Shutting down BMAD Core...');
    
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Stop strategy engine
    this.strategyEngine.stopMonitoring();
    
    this.emit('shutdown');
    console.log('✅ BMAD Core shutdown complete');
  }
}

// Export components and main class
export {
  BusinessStrategyEngine,
  CustomerIntelligence,
  WorkflowEngine,
  businessStrategy,
  customerIntelligence,
  workflowEngine
};

// Create and export default instance
export const bmadCore = new BMADCore();
export default bmadCore;