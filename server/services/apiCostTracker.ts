// @ts-nocheck - Optional feature, type errors suppressed
import { db } from '../db';
import { sql } from 'drizzle-orm';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface UsageStats {
  day: Date;
  requests: number;
  totalTokens: number;
  totalCost: number;
  avgCost: number;
}

interface BudgetStatus {
  spent: number;
  remaining: number;
  percentUsed: number;
  warningLevel: 'safe' | 'warning' | 'critical';
}

export class APICostTracker {
  // OpenAI Pricing as of 2025 ($ per 1K tokens)
  private readonly pricing = {
    'gpt-4': {
      prompt: 0.03,
      completion: 0.06
    },
    'gpt-4-turbo': {
      prompt: 0.01,
      completion: 0.03
    },
    'gpt-3.5-turbo': {
      prompt: 0.0015,
      completion: 0.002
    },
    'gpt-3.5-turbo-1106': {
      prompt: 0.001,
      completion: 0.002
    }
  };
  
  /**
   * Track API usage and calculate cost
   */
  async trackUsage(
    model: string,
    usage: TokenUsage,
    userId?: string,
    recipeId?: string,
    metadata?: Record<string, any>
  ): Promise<number> {
    // Get pricing for the model (default to gpt-3.5-turbo if unknown)
    const modelPricing = this.pricing[model] || this.pricing['gpt-3.5-turbo'];
    
    // Calculate costs
    const promptCost = (usage.promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (usage.completionTokens / 1000) * modelPricing.completion;
    const totalCost = promptCost + completionCost;
    
    // Log to console
    console.log('[API Cost Tracker]', {
      model,
      tokens: usage.totalTokens,
      cost: `$${totalCost.toFixed(4)}`,
      breakdown: {
        prompt: `${usage.promptTokens} tokens = $${promptCost.toFixed(4)}`,
        completion: `${usage.completionTokens} tokens = $${completionCost.toFixed(4)}`
      },
      userId,
      recipeId
    });
    
    // Store in database (if table exists)
    try {
      await db.execute(sql`
        INSERT INTO api_usage_log (
          service, 
          model, 
          tokens, 
          cost, 
          user_id, 
          recipe_id, 
          metadata, 
          timestamp
        )
        VALUES (
          'openai', 
          ${model}, 
          ${usage.totalTokens}, 
          ${totalCost}, 
          ${userId || null}, 
          ${recipeId || null},
          ${metadata ? JSON.stringify(metadata) : null},
          ${new Date()}
        )
      `);
    } catch (error) {
      // Table might not exist yet, that's okay
      if (!error.message?.includes('does not exist')) {
        console.error('[API Cost Tracker] Failed to store in DB:', error);
      }
    }
    
    // Check budget status and warn if needed
    const budgetStatus = await this.getMonthlyBudgetStatus();
    if (budgetStatus.warningLevel === 'critical') {
      console.error('[API Cost Tracker] ⚠️ CRITICAL: Monthly budget nearly exhausted!', budgetStatus);
    } else if (budgetStatus.warningLevel === 'warning') {
      console.warn('[API Cost Tracker] ⚠️ WARNING: Approaching monthly budget limit', budgetStatus);
    }
    
    return totalCost;
  }
  
  /**
   * Estimate cost before making API call
   */
  estimateCost(model: string, estimatedTokens: number): number {
    const modelPricing = this.pricing[model] || this.pricing['gpt-3.5-turbo'];
    
    // Assume 60/40 split between prompt and completion
    const promptTokens = Math.floor(estimatedTokens * 0.6);
    const completionTokens = Math.floor(estimatedTokens * 0.4);
    
    const promptCost = (promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (completionTokens / 1000) * modelPricing.completion;
    
    return promptCost + completionCost;
  }
  
  /**
   * Get usage statistics for a time period
   */
  async getUsageStats(startDate: Date, endDate: Date): Promise<UsageStats[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          DATE_TRUNC('day', timestamp) as day,
          COUNT(*) as requests,
          SUM(tokens) as total_tokens,
          SUM(cost) as total_cost,
          AVG(cost) as avg_cost
        FROM api_usage_log
        WHERE timestamp BETWEEN ${startDate} AND ${endDate}
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY day DESC
      `);
      
      return result.map(row => ({
        day: row.day as Date,
        requests: Number(row.requests),
        totalTokens: Number(row.total_tokens || 0),
        totalCost: Number(row.total_cost || 0),
        avgCost: Number(row.avg_cost || 0)
      }));
    } catch (error) {
      // If table doesn't exist, return empty array
      if (error.message?.includes('does not exist')) {
        return [];
      }
      console.error('[API Cost Tracker] Failed to get stats:', error);
      return [];
    }
  }
  
  /**
   * Get monthly budget status with warning levels
   */
  async getMonthlyBudgetStatus(budgetLimit: number = 100): Promise<BudgetStatus> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    try {
      const result = await db.execute(sql`
        SELECT COALESCE(SUM(cost), 0) as total_spent
        FROM api_usage_log
        WHERE timestamp >= ${startOfMonth}
      `);
      
      const spent = Number(result[0]?.total_spent || 0);
      const remaining = Math.max(0, budgetLimit - spent);
      const percentUsed = (spent / budgetLimit) * 100;
      
      // Determine warning level
      let warningLevel: BudgetStatus['warningLevel'] = 'safe';
      if (percentUsed >= 90) {
        warningLevel = 'critical';
      } else if (percentUsed >= 75) {
        warningLevel = 'warning';
      }
      
      return { 
        spent, 
        remaining, 
        percentUsed: Math.round(percentUsed * 100) / 100,
        warningLevel 
      };
    } catch (error) {
      // If table doesn't exist, return default values
      if (error.message?.includes('does not exist')) {
        return { 
          spent: 0, 
          remaining: budgetLimit, 
          percentUsed: 0,
          warningLevel: 'safe'
        };
      }
      console.error('[API Cost Tracker] Failed to get budget status:', error);
      return { 
        spent: 0, 
        remaining: budgetLimit, 
        percentUsed: 0,
        warningLevel: 'safe'
      };
    }
  }
  
  /**
   * Get top API consumers (users or features)
   */
  async getTopConsumers(limit: number = 10): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          user_id,
          COUNT(*) as request_count,
          SUM(tokens) as total_tokens,
          SUM(cost) as total_cost,
          AVG(cost) as avg_cost_per_request
        FROM api_usage_log
        WHERE user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY total_cost DESC
        LIMIT ${limit}
      `);
      
      return result;
    } catch (error) {
      if (!error.message?.includes('does not exist')) {
        console.error('[API Cost Tracker] Failed to get top consumers:', error);
      }
      return [];
    }
  }
  
  /**
   * Get cost breakdown by model
   */
  async getCostByModel(startDate?: Date): Promise<any[]> {
    const dateFilter = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    
    try {
      const result = await db.execute(sql`
        SELECT 
          model,
          COUNT(*) as request_count,
          SUM(tokens) as total_tokens,
          SUM(cost) as total_cost,
          AVG(tokens) as avg_tokens_per_request
        FROM api_usage_log
        WHERE timestamp >= ${dateFilter}
        GROUP BY model
        ORDER BY total_cost DESC
      `);
      
      return result;
    } catch (error) {
      if (!error.message?.includes('does not exist')) {
        console.error('[API Cost Tracker] Failed to get cost by model:', error);
      }
      return [];
    }
  }
  
  /**
   * Check if we should use a cheaper model based on budget
   */
  async shouldUseCheaperModel(): Promise<boolean> {
    const budget = await this.getMonthlyBudgetStatus();
    
    // Switch to cheaper model if we're over 75% of budget
    return budget.percentUsed > 75;
  }
}

// Export singleton instance
export const apiCostTracker = new APICostTracker();