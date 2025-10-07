/**
 * BMAD Core - Customer Intelligence System
 * Advanced customer analytics, segmentation, and predictive modeling
 */

import { EventEmitter } from 'events';

export interface CustomerProfile {
  id: string;
  role: 'admin' | 'trainer' | 'customer';
  registrationDate: Date;
  lastActiveDate: Date;
  subscription: {
    tier: string;
    startDate: Date;
    mrr: number;
    status: 'active' | 'cancelled' | 'paused';
  };
  behavior: {
    loginFrequency: number; // logins per week
    featuresUsed: Set<string>;
    sessionDuration: number; // average in minutes
    contentCreated: number; // meal plans, recipes, etc.
    lastActions: string[];
  };
  engagement: {
    score: number; // 0-100
    trend: 'increasing' | 'stable' | 'decreasing';
    riskLevel: 'none' | 'low' | 'medium' | 'high';
  };
  value: {
    ltv: number; // lifetime value
    revenue: number; // total revenue generated
    referrals: number;
    supportTickets: number;
  };
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  size: number;
  avgLTV: number;
  churnRate: number;
  characteristics: string[];
  recommendations: string[];
}

export interface SegmentCriteria {
  role?: string[];
  subscriptionTier?: string[];
  engagementScore?: { min: number; max: number };
  registrationAge?: { min: number; max: number }; // days
  revenue?: { min: number; max: number };
  behavior?: {
    minLoginFrequency?: number;
    featuresUsed?: string[];
    contentCreated?: { min: number; max: number };
  };
}

export interface ChurnPrediction {
  customerId: string;
  probability: number; // 0-1
  riskFactors: string[];
  timeframe: number; // predicted days until churn
  preventionStrategies: string[];
  confidence: number; // 0-1
}

export interface CustomerJourney {
  customerId: string;
  stage: 'awareness' | 'consideration' | 'onboarding' | 'activation' | 'retention' | 'advocacy';
  milestones: JourneyMilestone[];
  nextBestAction: string;
  completionRate: number; // 0-1
}

export interface JourneyMilestone {
  name: string;
  completed: boolean;
  completedAt?: Date;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

export class CustomerIntelligence extends EventEmitter {
  private customers: Map<string, CustomerProfile> = new Map();
  private segments: Map<string, CustomerSegment> = new Map();
  private churnModel: ChurnPredictor;
  private journeyTracker: JourneyTracker;
  
  constructor() {
    super();
    this.churnModel = new ChurnPredictor();
    this.journeyTracker = new JourneyTracker();
    this.initializeSegments();
  }

  private initializeSegments(): void {
    // Power Users
    this.segments.set('power-users', {
      id: 'power-users',
      name: 'Power Users',
      description: 'Highly engaged users who use the platform daily',
      criteria: {
        engagementScore: { min: 80, max: 100 },
        behavior: {
          minLoginFrequency: 5,
          contentCreated: { min: 10, max: 1000 }
        }
      },
      size: 0,
      avgLTV: 0,
      churnRate: 0.02,
      characteristics: [
        'Daily active users',
        'Create multiple meal plans weekly',
        'High feature adoption',
        'Low support needs'
      ],
      recommendations: [
        'Offer beta features',
        'Provide VIP support',
        'Request testimonials',
        'Involve in product development'
      ]
    });

    // At Risk
    this.segments.set('at-risk', {
      id: 'at-risk',
      name: 'At Risk',
      description: 'Users showing signs of potential churn',
      criteria: {
        engagementScore: { min: 0, max: 40 },
        behavior: {
          minLoginFrequency: 0,
          contentCreated: { min: 0, max: 2 }
        }
      },
      size: 0,
      avgLTV: 0,
      churnRate: 0.25,
      characteristics: [
        'Declining login frequency',
        'Low feature usage',
        'Increased support tickets',
        'No recent content creation'
      ],
      recommendations: [
        'Send re-engagement campaigns',
        'Offer personalized assistance',
        'Provide usage tips',
        'Consider discount offers'
      ]
    });

    // Growth Potential
    this.segments.set('growth-potential', {
      id: 'growth-potential',
      name: 'Growth Potential',
      description: 'Active users ready for upselling',
      criteria: {
        subscriptionTier: ['basic'],
        engagementScore: { min: 60, max: 80 },
        behavior: {
          minLoginFrequency: 3,
          contentCreated: { min: 5, max: 20 }
        }
      },
      size: 0,
      avgLTV: 0,
      churnRate: 0.08,
      characteristics: [
        'Regular platform usage',
        'Approaching plan limits',
        'Good engagement metrics',
        'Price-sensitive'
      ],
      recommendations: [
        'Highlight premium features',
        'Show usage approaching limits',
        'Offer upgrade trials',
        'Demonstrate ROI of upgrade'
      ]
    });

    // New Users
    this.segments.set('new-users', {
      id: 'new-users',
      name: 'New Users',
      description: 'Recently registered users in onboarding phase',
      criteria: {
        registrationAge: { min: 0, max: 30 }
      },
      size: 0,
      avgLTV: 0,
      churnRate: 0.30,
      characteristics: [
        'Learning platform features',
        'High support needs',
        'Variable engagement',
        'Critical activation period'
      ],
      recommendations: [
        'Provide onboarding tutorials',
        'Send welcome email series',
        'Offer initial success coaching',
        'Monitor activation metrics closely'
      ]
    });

    // Champions
    this.segments.set('champions', {
      id: 'champions',
      name: 'Champions',
      description: 'Top advocates who refer others',
      criteria: {
        engagementScore: { min: 90, max: 100 },
        value: {
          referrals: 2
        }
      },
      size: 0,
      avgLTV: 0,
      churnRate: 0.01,
      characteristics: [
        'Generate referrals',
        'Provide feedback',
        'Active in community',
        'Long-term customers'
      ],
      recommendations: [
        'Create ambassador program',
        'Provide referral incentives',
        'Feature success stories',
        'Offer exclusive perks'
      ]
    });
  }

  /**
   * Analyze customer and assign to appropriate segments
   */
  public analyzeCustomer(customerId: string, data: Partial<CustomerProfile>): CustomerProfile {
    const existing = this.customers.get(customerId);
    const profile: CustomerProfile = {
      ...this.createDefaultProfile(customerId),
      ...existing,
      ...data
    };
    
    // Calculate engagement score
    profile.engagement.score = this.calculateEngagementScore(profile);
    
    // Determine engagement trend
    profile.engagement.trend = this.calculateEngagementTrend(profile);
    
    // Assess risk level
    profile.engagement.riskLevel = this.assessRiskLevel(profile);
    
    // Calculate LTV
    profile.value.ltv = this.calculateLTV(profile);
    
    this.customers.set(customerId, profile);
    
    // Assign to segments
    this.assignToSegments(profile);
    
    // Emit analysis complete event
    this.emit('customer-analyzed', profile);
    
    return profile;
  }

  private createDefaultProfile(customerId: string): CustomerProfile {
    return {
      id: customerId,
      role: 'customer',
      registrationDate: new Date(),
      lastActiveDate: new Date(),
      subscription: {
        tier: 'basic',
        startDate: new Date(),
        mrr: 0,
        status: 'active'
      },
      behavior: {
        loginFrequency: 0,
        featuresUsed: new Set(),
        sessionDuration: 0,
        contentCreated: 0,
        lastActions: []
      },
      engagement: {
        score: 50,
        trend: 'stable',
        riskLevel: 'none'
      },
      value: {
        ltv: 0,
        revenue: 0,
        referrals: 0,
        supportTickets: 0
      }
    };
  }

  private calculateEngagementScore(profile: CustomerProfile): number {
    let score = 0;
    const weights = {
      loginFrequency: 0.25,
      featuresUsed: 0.20,
      sessionDuration: 0.15,
      contentCreated: 0.20,
      recency: 0.20
    };
    
    // Login frequency score (0-100)
    const loginScore = Math.min(profile.behavior.loginFrequency * 20, 100);
    score += loginScore * weights.loginFrequency;
    
    // Features used score (0-100)
    const featureScore = Math.min(profile.behavior.featuresUsed.size * 10, 100);
    score += featureScore * weights.featuresUsed;
    
    // Session duration score (0-100)
    const sessionScore = Math.min(profile.behavior.sessionDuration * 2, 100);
    score += sessionScore * weights.sessionDuration;
    
    // Content creation score (0-100)
    const contentScore = Math.min(profile.behavior.contentCreated * 5, 100);
    score += contentScore * weights.contentCreated;
    
    // Recency score (0-100)
    const daysSinceActive = Math.floor((Date.now() - profile.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
    const recencyScore = Math.max(100 - daysSinceActive * 5, 0);
    score += recencyScore * weights.recency;
    
    return Math.round(score);
  }

  private calculateEngagementTrend(profile: CustomerProfile): 'increasing' | 'stable' | 'decreasing' {
    // This would analyze historical engagement data
    // For now, using simple logic based on current score
    if (profile.engagement.score > 70) return 'increasing';
    if (profile.engagement.score < 40) return 'decreasing';
    return 'stable';
  }

  private assessRiskLevel(profile: CustomerProfile): 'none' | 'low' | 'medium' | 'high' {
    const riskFactors = [];
    
    // Check engagement score
    if (profile.engagement.score < 30) riskFactors.push('low_engagement');
    
    // Check login frequency
    if (profile.behavior.loginFrequency < 1) riskFactors.push('infrequent_login');
    
    // Check recency
    const daysSinceActive = Math.floor((Date.now() - profile.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceActive > 14) riskFactors.push('inactive');
    
    // Check support tickets
    if (profile.value.supportTickets > 5) riskFactors.push('high_support_needs');
    
    // Determine risk level
    if (riskFactors.length >= 3) return 'high';
    if (riskFactors.length >= 2) return 'medium';
    if (riskFactors.length >= 1) return 'low';
    return 'none';
  }

  private calculateLTV(profile: CustomerProfile): number {
    const { subscription, value } = profile;
    
    // Simple LTV calculation: MRR * expected lifetime in months
    const avgCustomerLifetime = 24; // months
    const churnProbability = this.getChurnProbability(profile);
    const expectedLifetime = avgCustomerLifetime * (1 - churnProbability);
    
    const baseLTV = subscription.mrr * expectedLifetime;
    
    // Add referral value
    const referralValue = value.referrals * 100; // Assumed value per referral
    
    // Subtract support costs
    const supportCost = value.supportTickets * 10; // Assumed cost per ticket
    
    return Math.max(baseLTV + referralValue - supportCost, 0);
  }

  private getChurnProbability(profile: CustomerProfile): number {
    // Use engagement score and risk level to estimate churn probability
    const baseChurn = 0.1; // 10% baseline
    
    let multiplier = 1;
    if (profile.engagement.riskLevel === 'high') multiplier = 3;
    else if (profile.engagement.riskLevel === 'medium') multiplier = 2;
    else if (profile.engagement.riskLevel === 'low') multiplier = 1.5;
    
    // Adjust based on engagement score
    const engagementAdjustment = (100 - profile.engagement.score) / 100;
    
    return Math.min(baseChurn * multiplier * (1 + engagementAdjustment), 1);
  }

  private assignToSegments(profile: CustomerProfile): void {
    for (const [segmentId, segment] of this.segments) {
      if (this.matchesSegmentCriteria(profile, segment.criteria)) {
        // Add customer to segment
        segment.size++;
        
        // Update segment metrics
        this.updateSegmentMetrics(segment, profile);
        
        this.emit('customer-segmented', { customerId: profile.id, segmentId });
      }
    }
  }

  private matchesSegmentCriteria(profile: CustomerProfile, criteria: SegmentCriteria): boolean {
    // Check role
    if (criteria.role && !criteria.role.includes(profile.role)) return false;
    
    // Check subscription tier
    if (criteria.subscriptionTier && !criteria.subscriptionTier.includes(profile.subscription.tier)) {
      return false;
    }
    
    // Check engagement score
    if (criteria.engagementScore) {
      const { min, max } = criteria.engagementScore;
      if (profile.engagement.score < min || profile.engagement.score > max) return false;
    }
    
    // Check registration age
    if (criteria.registrationAge) {
      const daysOld = Math.floor((Date.now() - profile.registrationDate.getTime()) / (1000 * 60 * 60 * 24));
      const { min, max } = criteria.registrationAge;
      if (daysOld < min || daysOld > max) return false;
    }
    
    // Check behavior criteria
    if (criteria.behavior) {
      const { minLoginFrequency, contentCreated } = criteria.behavior;
      if (minLoginFrequency && profile.behavior.loginFrequency < minLoginFrequency) return false;
      if (contentCreated) {
        const { min, max } = contentCreated;
        if (profile.behavior.contentCreated < min || profile.behavior.contentCreated > max) return false;
      }
    }
    
    return true;
  }

  private updateSegmentMetrics(segment: CustomerSegment, profile: CustomerProfile): void {
    // Update average LTV
    const currentTotal = segment.avgLTV * (segment.size - 1);
    segment.avgLTV = (currentTotal + profile.value.ltv) / segment.size;
  }

  /**
   * Predict churn probability for a customer
   */
  public predictChurn(customerId: string): ChurnPrediction {
    const profile = this.customers.get(customerId);
    if (!profile) {
      throw new Error(`Customer ${customerId} not found`);
    }
    
    return this.churnModel.predict(profile);
  }

  /**
   * Get customer journey status
   */
  public getCustomerJourney(customerId: string): CustomerJourney {
    const profile = this.customers.get(customerId);
    if (!profile) {
      throw new Error(`Customer ${customerId} not found`);
    }
    
    return this.journeyTracker.getJourney(profile);
  }

  /**
   * Get segment recommendations for a customer
   */
  public getSegmentRecommendations(customerId: string): string[] {
    const recommendations: string[] = [];
    const profile = this.customers.get(customerId);
    
    if (!profile) return recommendations;
    
    for (const [segmentId, segment] of this.segments) {
      if (this.matchesSegmentCriteria(profile, segment.criteria)) {
        recommendations.push(...segment.recommendations);
      }
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Get next best action for a customer
   */
  public getNextBestAction(customerId: string): string {
    const profile = this.customers.get(customerId);
    if (!profile) return 'Complete registration';
    
    const journey = this.getCustomerJourney(customerId);
    const churnRisk = this.predictChurn(customerId);
    
    // High churn risk takes priority
    if (churnRisk.probability > 0.7) {
      return churnRisk.preventionStrategies[0] || 'Send retention offer';
    }
    
    // Otherwise, focus on journey progression
    return journey.nextBestAction;
  }
}

/**
 * Churn prediction model
 */
class ChurnPredictor {
  predict(profile: CustomerProfile): ChurnPrediction {
    const riskFactors: string[] = [];
    let probability = 0;
    
    // Analyze risk factors
    if (profile.engagement.score < 30) {
      riskFactors.push('Low engagement score');
      probability += 0.3;
    }
    
    if (profile.behavior.loginFrequency < 1) {
      riskFactors.push('Infrequent logins');
      probability += 0.2;
    }
    
    const daysSinceActive = Math.floor((Date.now() - profile.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceActive > 14) {
      riskFactors.push('No recent activity');
      probability += 0.25;
    }
    
    if (profile.behavior.contentCreated === 0) {
      riskFactors.push('No content created');
      probability += 0.15;
    }
    
    if (profile.value.supportTickets > 5) {
      riskFactors.push('High support needs');
      probability += 0.1;
    }
    
    // Cap probability at 0.95
    probability = Math.min(probability, 0.95);
    
    // Calculate timeframe based on probability
    const timeframe = Math.round(30 * (1 - probability)); // Days until likely churn
    
    // Generate prevention strategies
    const preventionStrategies = this.generatePreventionStrategies(profile, riskFactors);
    
    return {
      customerId: profile.id,
      probability,
      riskFactors,
      timeframe,
      preventionStrategies,
      confidence: 0.75 // Model confidence
    };
  }
  
  private generatePreventionStrategies(profile: CustomerProfile, riskFactors: string[]): string[] {
    const strategies: string[] = [];
    
    if (riskFactors.includes('Low engagement score')) {
      strategies.push('Send personalized re-engagement email series');
      strategies.push('Offer free coaching session');
    }
    
    if (riskFactors.includes('Infrequent logins')) {
      strategies.push('Send activity reminder notifications');
      strategies.push('Highlight new features via email');
    }
    
    if (riskFactors.includes('No content created')) {
      strategies.push('Provide guided meal plan creation tutorial');
      strategies.push('Offer pre-made template library');
    }
    
    if (riskFactors.includes('High support needs')) {
      strategies.push('Schedule proactive support call');
      strategies.push('Provide dedicated success manager');
    }
    
    // Add general retention strategies
    strategies.push('Offer loyalty discount');
    strategies.push('Send success story inspirations');
    
    return strategies;
  }
}

/**
 * Customer journey tracker
 */
class JourneyTracker {
  getJourney(profile: CustomerProfile): CustomerJourney {
    const milestones = this.getJourneyMilestones(profile);
    const stage = this.determineStage(profile, milestones);
    const completionRate = this.calculateCompletionRate(milestones);
    const nextBestAction = this.determineNextAction(profile, milestones, stage);
    
    return {
      customerId: profile.id,
      stage,
      milestones,
      nextBestAction,
      completionRate
    };
  }
  
  private getJourneyMilestones(profile: CustomerProfile): JourneyMilestone[] {
    return [
      {
        name: 'Account Created',
        completed: true,
        completedAt: profile.registrationDate,
        importance: 'critical'
      },
      {
        name: 'Profile Completed',
        completed: profile.behavior.featuresUsed.has('profile-edit'),
        importance: 'high'
      },
      {
        name: 'First Login',
        completed: profile.behavior.loginFrequency > 0,
        importance: 'critical'
      },
      {
        name: 'First Meal Plan Created',
        completed: profile.behavior.contentCreated > 0,
        importance: 'critical'
      },
      {
        name: 'Five Meal Plans Created',
        completed: profile.behavior.contentCreated >= 5,
        importance: 'high'
      },
      {
        name: 'Feature Discovery',
        completed: profile.behavior.featuresUsed.size >= 5,
        importance: 'medium'
      },
      {
        name: 'Regular Usage Established',
        completed: profile.behavior.loginFrequency >= 3,
        importance: 'high'
      },
      {
        name: 'Referral Made',
        completed: profile.value.referrals > 0,
        importance: 'low'
      }
    ];
  }
  
  private determineStage(
    profile: CustomerProfile,
    milestones: JourneyMilestone[]
  ): CustomerJourney['stage'] {
    const criticalMilestones = milestones.filter(m => m.importance === 'critical');
    const completedCritical = criticalMilestones.filter(m => m.completed).length;
    
    if (completedCritical === 0) return 'awareness';
    if (completedCritical === 1) return 'consideration';
    if (completedCritical === 2) return 'onboarding';
    if (completedCritical === 3) return 'activation';
    if (profile.value.referrals > 0) return 'advocacy';
    return 'retention';
  }
  
  private calculateCompletionRate(milestones: JourneyMilestone[]): number {
    const completed = milestones.filter(m => m.completed).length;
    return completed / milestones.length;
  }
  
  private determineNextAction(
    profile: CustomerProfile,
    milestones: JourneyMilestone[],
    stage: CustomerJourney['stage']
  ): string {
    // Find next incomplete critical milestone
    const nextCritical = milestones.find(m => !m.completed && m.importance === 'critical');
    if (nextCritical) {
      switch (nextCritical.name) {
        case 'First Login':
          return 'Send welcome email with login link';
        case 'First Meal Plan Created':
          return 'Provide guided meal plan creation tutorial';
        default:
          return `Complete: ${nextCritical.name}`;
      }
    }
    
    // Stage-specific actions
    switch (stage) {
      case 'onboarding':
        return 'Complete profile setup';
      case 'activation':
        return 'Explore advanced features';
      case 'retention':
        return 'Maintain regular usage';
      case 'advocacy':
        return 'Share success story';
      default:
        return 'Continue journey';
    }
  }
}

// Export singleton instance
export const customerIntelligence = new CustomerIntelligence();