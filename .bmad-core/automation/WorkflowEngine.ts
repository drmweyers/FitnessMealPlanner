/**
 * BMAD Core - Workflow Automation Engine
 * Business process automation and orchestration system
 */

import { EventEmitter } from 'events';
import { Engine, Rule, RuleProperties } from 'json-rules-engine';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  schedule?: CronSchedule;
  enabled: boolean;
  priority: number;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    executionCount: number;
    lastExecuted?: Date;
    successRate: number;
  };
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'webhook' | 'manual' | 'condition';
  event?: string;
  schedule?: string; // cron expression
  webhook?: string;
  condition?: any;
}

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'notIn';
  value: any;
  combineWith?: 'AND' | 'OR';
}

export interface WorkflowAction {
  id: string;
  type: 'email' | 'notification' | 'updateData' | 'apiCall' | 'assignTask' | 'createContent' | 'analytics' | 'workflow';
  config: any;
  onSuccess?: WorkflowAction[];
  onFailure?: WorkflowAction[];
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface CronSchedule {
  expression: string;
  timezone: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: any;
  output?: any;
  error?: string;
  steps: ExecutionStep[];
}

export interface ExecutionStep {
  actionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: any;
  error?: string;
}

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private rulesEngine: Engine;
  private executions: Map<string, WorkflowExecution> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    super();
    this.rulesEngine = new Engine();
    this.initializeDefaultWorkflows();
  }

  private initializeDefaultWorkflows(): void {
    // Customer Onboarding Workflow
    this.addWorkflow({
      id: 'customer-onboarding',
      name: 'Customer Onboarding Automation',
      description: 'Automated onboarding sequence for new customers',
      trigger: {
        type: 'event',
        event: 'user.registered'
      },
      conditions: [
        {
          id: 'is-customer',
          field: 'user.role',
          operator: 'equals',
          value: 'customer'
        }
      ],
      actions: [
        {
          id: 'send-welcome-email',
          type: 'email',
          config: {
            template: 'welcome-customer',
            subject: 'Welcome to FitnessMealPlanner!',
            delay: 0
          }
        },
        {
          id: 'schedule-tutorial-email',
          type: 'email',
          config: {
            template: 'tutorial-series-1',
            subject: 'Getting Started with Your Meal Plans',
            delay: 86400000 // 1 day
          }
        },
        {
          id: 'create-sample-meal-plan',
          type: 'createContent',
          config: {
            contentType: 'meal-plan',
            template: 'sample-balanced-diet',
            assignToUser: true
          }
        },
        {
          id: 'track-onboarding',
          type: 'analytics',
          config: {
            event: 'onboarding.started',
            properties: ['userId', 'source', 'timestamp']
          }
        }
      ],
      enabled: true,
      priority: 1,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
        successRate: 1.0
      }
    });

    // Trainer Engagement Workflow
    this.addWorkflow({
      id: 'trainer-engagement',
      name: 'Trainer Engagement Optimization',
      description: 'Boost trainer activity and customer management',
      trigger: {
        type: 'schedule',
        schedule: '0 9 * * MON' // Every Monday at 9 AM
      },
      conditions: [
        {
          id: 'low-activity',
          field: 'trainer.weeklyLogins',
          operator: 'lessThan',
          value: 3
        }
      ],
      actions: [
        {
          id: 'send-engagement-tips',
          type: 'email',
          config: {
            template: 'trainer-weekly-tips',
            subject: 'Boost Your Client Results This Week',
            personalized: true
          }
        },
        {
          id: 'highlight-new-features',
          type: 'notification',
          config: {
            type: 'in-app',
            message: 'Check out new meal planning features',
            link: '/features/new'
          }
        }
      ],
      enabled: true,
      priority: 2,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
        successRate: 1.0
      }
    });

    // Churn Prevention Workflow
    this.addWorkflow({
      id: 'churn-prevention',
      name: 'Automated Churn Prevention',
      description: 'Prevent customer churn through targeted interventions',
      trigger: {
        type: 'condition',
        condition: {
          any: [
            { fact: 'engagement.score', operator: 'lessThan', value: 30 },
            { fact: 'daysSinceLogin', operator: 'greaterThan', value: 14 }
          ]
        }
      },
      conditions: [
        {
          id: 'is-paying-customer',
          field: 'subscription.status',
          operator: 'equals',
          value: 'active'
        }
      ],
      actions: [
        {
          id: 'send-re-engagement-email',
          type: 'email',
          config: {
            template: 'win-back-campaign',
            subject: 'We Miss You! Here\'s 20% Off',
            includeDiscount: true,
            discountCode: 'COMEBACK20'
          }
        },
        {
          id: 'assign-success-manager',
          type: 'assignTask',
          config: {
            taskType: 'customer-success-call',
            assignee: 'success-team',
            priority: 'high',
            dueIn: 48 // hours
          }
        },
        {
          id: 'track-intervention',
          type: 'analytics',
          config: {
            event: 'churn.prevention.triggered',
            properties: ['userId', 'riskScore', 'interventionType']
          }
        }
      ],
      enabled: true,
      priority: 1,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
        successRate: 1.0
      }
    });

    // Upsell Opportunity Workflow
    this.addWorkflow({
      id: 'upsell-opportunity',
      name: 'Automated Upsell Campaign',
      description: 'Identify and convert upsell opportunities',
      trigger: {
        type: 'event',
        event: 'usage.limit.approaching'
      },
      conditions: [
        {
          id: 'on-basic-plan',
          field: 'subscription.tier',
          operator: 'equals',
          value: 'basic'
        },
        {
          id: 'high-engagement',
          field: 'engagement.score',
          operator: 'greaterThan',
          value: 70,
          combineWith: 'AND'
        }
      ],
      actions: [
        {
          id: 'show-upgrade-prompt',
          type: 'notification',
          config: {
            type: 'modal',
            title: 'You\'re Approaching Your Plan Limits',
            message: 'Upgrade to Professional for unlimited meal plans',
            cta: 'View Upgrade Options',
            link: '/pricing'
          }
        },
        {
          id: 'send-upgrade-email',
          type: 'email',
          config: {
            template: 'upgrade-benefits',
            subject: 'Unlock More Features with Professional',
            delay: 86400000, // 1 day after notification
            includeComparison: true
          }
        },
        {
          id: 'offer-trial',
          type: 'updateData',
          config: {
            field: 'trial.professional',
            value: true,
            duration: 604800000 // 7 days
          },
          onSuccess: [
            {
              id: 'notify-trial-started',
              type: 'notification',
              config: {
                type: 'success',
                message: 'Your 7-day Professional trial has started!'
              }
            }
          ]
        }
      ],
      enabled: true,
      priority: 2,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
        successRate: 1.0
      }
    });

    // Content Quality Control Workflow
    this.addWorkflow({
      id: 'content-quality',
      name: 'Recipe Quality Assurance',
      description: 'Automated quality checks for new recipes',
      trigger: {
        type: 'event',
        event: 'recipe.created'
      },
      conditions: [],
      actions: [
        {
          id: 'validate-nutrition',
          type: 'apiCall',
          config: {
            endpoint: '/api/nutrition/validate',
            method: 'POST',
            body: { recipeId: '{{recipe.id}}' }
          },
          onFailure: [
            {
              id: 'flag-for-review',
              type: 'updateData',
              config: {
                field: 'recipe.status',
                value: 'pending-review'
              }
            }
          ]
        },
        {
          id: 'check-ingredients',
          type: 'apiCall',
          config: {
            endpoint: '/api/ingredients/validate',
            method: 'POST',
            body: { ingredients: '{{recipe.ingredients}}' }
          }
        },
        {
          id: 'auto-categorize',
          type: 'apiCall',
          config: {
            endpoint: '/api/ai/categorize',
            method: 'POST',
            body: { 
              title: '{{recipe.title}}',
              ingredients: '{{recipe.ingredients}}',
              nutrition: '{{recipe.nutrition}}'
            }
          }
        }
      ],
      enabled: true,
      priority: 3,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
        successRate: 1.0
      }
    });
  }

  /**
   * Add or update a workflow
   */
  public addWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    
    // Set up scheduled trigger if applicable
    if (workflow.trigger.type === 'schedule' && workflow.trigger.schedule) {
      this.scheduleWorkflow(workflow);
    }
    
    // Set up rule engine conditions
    if (workflow.trigger.type === 'condition' && workflow.trigger.condition) {
      this.setupConditionTrigger(workflow);
    }
    
    this.emit('workflow-added', workflow);
  }

  /**
   * Execute a workflow
   */
  public async executeWorkflow(
    workflowId: string,
    input: any = {},
    executionId?: string
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`);
    }
    
    // Create execution record
    const execution: WorkflowExecution = {
      id: executionId || this.generateExecutionId(),
      workflowId,
      startTime: new Date(),
      status: 'running',
      input,
      steps: []
    };
    
    this.executions.set(execution.id, execution);
    this.emit('workflow-started', execution);
    
    try {
      // Check conditions
      if (workflow.conditions.length > 0) {
        const conditionsMet = await this.evaluateConditions(workflow.conditions, input);
        if (!conditionsMet) {
          execution.status = 'skipped';
          execution.endTime = new Date();
          this.emit('workflow-skipped', execution);
          return execution;
        }
      }
      
      // Execute actions sequentially
      for (const action of workflow.actions) {
        const step = await this.executeAction(action, input, execution);
        execution.steps.push(step);
        
        if (step.status === 'failed') {
          // Execute failure actions if defined
          if (action.onFailure) {
            for (const failureAction of action.onFailure) {
              await this.executeAction(failureAction, input, execution);
            }
          }
          
          // Stop workflow on critical failure
          if (!action.retryPolicy) {
            execution.status = 'failed';
            execution.error = step.error;
            break;
          }
        } else if (step.status === 'completed' && action.onSuccess) {
          // Execute success actions
          for (const successAction of action.onSuccess) {
            const successStep = await this.executeAction(successAction, input, execution);
            execution.steps.push(successStep);
          }
        }
      }
      
      if (execution.status === 'running') {
        execution.status = 'completed';
      }
      
      execution.endTime = new Date();
      
      // Update workflow metadata
      workflow.metadata.executionCount++;
      workflow.metadata.lastExecuted = new Date();
      if (execution.status === 'completed') {
        const successCount = workflow.metadata.executionCount * workflow.metadata.successRate;
        workflow.metadata.successRate = (successCount + 1) / (workflow.metadata.executionCount);
      } else {
        const successCount = workflow.metadata.executionCount * workflow.metadata.successRate;
        workflow.metadata.successRate = successCount / workflow.metadata.executionCount;
      }
      
      this.emit('workflow-completed', execution);
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.endTime = new Date();
      this.emit('workflow-failed', execution);
    }
    
    return execution;
  }

  private async evaluateConditions(conditions: WorkflowCondition[], input: any): Promise<boolean> {
    let result = true;
    let combineWithOr = false;
    
    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(input, condition.field);
      let conditionMet = false;
      
      switch (condition.operator) {
        case 'equals':
          conditionMet = fieldValue === condition.value;
          break;
        case 'notEquals':
          conditionMet = fieldValue !== condition.value;
          break;
        case 'contains':
          conditionMet = String(fieldValue).includes(String(condition.value));
          break;
        case 'greaterThan':
          conditionMet = fieldValue > condition.value;
          break;
        case 'lessThan':
          conditionMet = fieldValue < condition.value;
          break;
        case 'between':
          conditionMet = fieldValue >= condition.value[0] && fieldValue <= condition.value[1];
          break;
        case 'in':
          conditionMet = condition.value.includes(fieldValue);
          break;
        case 'notIn':
          conditionMet = !condition.value.includes(fieldValue);
          break;
      }
      
      if (condition.combineWith === 'OR') {
        combineWithOr = true;
        result = result || conditionMet;
      } else {
        result = result && conditionMet;
      }
      
      if (!result && !combineWithOr) {
        break; // Short-circuit on AND failure
      }
    }
    
    return result;
  }

  private async executeAction(
    action: WorkflowAction,
    input: any,
    execution: WorkflowExecution
  ): Promise<ExecutionStep> {
    const step: ExecutionStep = {
      actionId: action.id,
      startTime: new Date(),
      status: 'running'
    };
    
    try {
      switch (action.type) {
        case 'email':
          step.output = await this.executeEmailAction(action.config, input);
          break;
        
        case 'notification':
          step.output = await this.executeNotificationAction(action.config, input);
          break;
        
        case 'updateData':
          step.output = await this.executeUpdateDataAction(action.config, input);
          break;
        
        case 'apiCall':
          step.output = await this.executeApiCallAction(action.config, input);
          break;
        
        case 'assignTask':
          step.output = await this.executeAssignTaskAction(action.config, input);
          break;
        
        case 'createContent':
          step.output = await this.executeCreateContentAction(action.config, input);
          break;
        
        case 'analytics':
          step.output = await this.executeAnalyticsAction(action.config, input);
          break;
        
        case 'workflow':
          // Execute another workflow
          const nestedExecution = await this.executeWorkflow(action.config.workflowId, input);
          step.output = nestedExecution;
          break;
        
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
      
      step.status = 'completed';
      
    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : String(error);
      
      // Retry logic
      if (action.retryPolicy && action.retryPolicy.maxAttempts > 0) {
        for (let attempt = 1; attempt <= action.retryPolicy.maxAttempts; attempt++) {
          await this.delay(action.retryPolicy.backoffMs * attempt);
          
          try {
            step.output = await this.executeAction(action, input, execution);
            step.status = 'completed';
            break;
          } catch (retryError) {
            // Continue retrying
          }
        }
      }
    }
    
    step.endTime = new Date();
    return step;
  }

  private async executeEmailAction(config: any, input: any): Promise<any> {
    // Integration with email service
    this.emit('action-email', { config, input });
    return { sent: true, messageId: this.generateId() };
  }

  private async executeNotificationAction(config: any, input: any): Promise<any> {
    // Integration with notification service
    this.emit('action-notification', { config, input });
    return { delivered: true, notificationId: this.generateId() };
  }

  private async executeUpdateDataAction(config: any, input: any): Promise<any> {
    // Integration with data service
    this.emit('action-update-data', { config, input });
    return { updated: true, field: config.field, value: config.value };
  }

  private async executeApiCallAction(config: any, input: any): Promise<any> {
    // Integration with API service
    this.emit('action-api-call', { config, input });
    return { status: 200, data: {} };
  }

  private async executeAssignTaskAction(config: any, input: any): Promise<any> {
    // Integration with task management service
    this.emit('action-assign-task', { config, input });
    return { assigned: true, taskId: this.generateId() };
  }

  private async executeCreateContentAction(config: any, input: any): Promise<any> {
    // Integration with content creation service
    this.emit('action-create-content', { config, input });
    return { created: true, contentId: this.generateId() };
  }

  private async executeAnalyticsAction(config: any, input: any): Promise<any> {
    // Integration with analytics service
    this.emit('action-analytics', { config, input });
    return { tracked: true, eventId: this.generateId() };
  }

  private scheduleWorkflow(workflow: WorkflowDefinition): void {
    // Cancel existing schedule
    const existingJob = this.scheduledJobs.get(workflow.id);
    if (existingJob) {
      clearInterval(existingJob);
    }
    
    // Parse cron expression and create schedule
    // For simplicity, using setInterval with parsed interval
    const interval = this.parseCronInterval(workflow.trigger.schedule!);
    const job = setInterval(() => {
      this.executeWorkflow(workflow.id, { trigger: 'scheduled' });
    }, interval);
    
    this.scheduledJobs.set(workflow.id, job);
  }

  private setupConditionTrigger(workflow: WorkflowDefinition): void {
    // Set up rules engine trigger
    const rule: RuleProperties = {
      conditions: workflow.trigger.condition!,
      event: {
        type: 'workflow-trigger',
        params: {
          workflowId: workflow.id
        }
      }
    };
    
    this.rulesEngine.addRule(rule);
  }

  private parseCronInterval(cronExpression: string): number {
    // Simplified cron parsing - returns milliseconds
    // In production, use a proper cron parser library
    if (cronExpression.includes('* * * * *')) return 60000; // Every minute
    if (cronExpression.includes('0 * * * *')) return 3600000; // Every hour
    if (cronExpression.includes('0 0 * * *')) return 86400000; // Every day
    if (cronExpression.includes('0 0 * * 0')) return 604800000; // Every week
    return 86400000; // Default to daily
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateExecutionId(): string {
    return `exec_${this.generateId()}`;
  }

  /**
   * Get workflow execution history
   */
  public getExecutionHistory(workflowId?: string): WorkflowExecution[] {
    const executions = Array.from(this.executions.values());
    
    if (workflowId) {
      return executions.filter(e => e.workflowId === workflowId);
    }
    
    return executions;
  }

  /**
   * Get workflow statistics
   */
  public getWorkflowStats(workflowId: string): any {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;
    
    const executions = this.getExecutionHistory(workflowId);
    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const avgDuration = executions
      .filter(e => e.endTime)
      .reduce((sum, e) => {
        return sum + (e.endTime!.getTime() - e.startTime.getTime());
      }, 0) / executions.length || 0;
    
    return {
      totalExecutions: workflow.metadata.executionCount,
      successRate: workflow.metadata.successRate,
      successful,
      failed,
      avgDuration: Math.round(avgDuration),
      lastExecuted: workflow.metadata.lastExecuted
    };
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();