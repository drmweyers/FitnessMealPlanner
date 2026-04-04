---
title: EvoFit Meals 14-Day Actor-Based Simulation System
status: draft
date: 2026-04-02
author: Claude (CTO Assistant)
---

# EvoFit Meals 14-Day Actor-Based Simulation System

## Overview

A robust actor-based simulation system for EvoFit Meals that implements the FORGE methodology to validate platform functionality through realistic multi-role user workflows. This system combines API seeding, Playwright E2E testing, and actor-based patterns to simulate 14 days of nutritionist-client interactions.

## Goals

1. **Fix Test Coverage Reporting** - Resolve Vitest coverage configuration showing 0%
2. **Create Reusable Simulation Skill** - Global skill at `~/.claude/skills/evofit-meals-simulation/`
3. **Implement 14-Day Workflow** - Realistic daily interactions between nutritionists and clients
4. **Validate Platform Health** - Run after every deployment to catch regressions
5. **Establish FORGE Pattern** - Document reusable simulation methodology

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Simulation Orchestrator                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Phase 1    │  │   Phase 2    │  │   Phase 3    │          │
│  │    Seed      │→ │    Act       │→ │   Verify     │          │
│  │    Data      │  │   Workflows  │  │   Results    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  API Calls   │  │  Actor-based │  │  Assertions  │          │
│  │  to Prod     │  │  Interactions│  │  & Reports   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Actor Pool                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │NutritionistActor│  │  ClientActor   │  │  AdminActor    │    │
│  │                │  │                │  │                │    │
│  │• Create plans  │  │• Log nutrition │  │• Manage users  │    │
│  │• Assign clients│  │• View progress │  │• View analytics│    │
│  │• Review logs   │  │• Update goals  │  │• System config │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
~/.claude/skills/evofit-meals-simulation/
├── SKILL.md                              # Skill documentation
├── lib/
│   ├── actors/
│   │   ├── BaseActor.ts                  # Shared auth, state, requests
│   │   ├── NutritionistActor.ts          # Nutritionist-specific actions
│   │   ├── ClientActor.ts                # Client-specific actions
│   │   └── AdminActor.ts                 # Admin-specific actions
│   ├── workflows/
│   │   ├── FourteenDayWorkflow.ts        # Main workflow orchestrator
│   │   └── DailyRoutineWorkflow.ts       # Single day routine
│   ├── generators/
│   │   ├── MealPlanGenerator.ts          # Generate realistic meal plans
│   │   ├── NutritionLogGenerator.ts      # Generate daily nutrition logs
│   │   ├── ProgressGenerator.ts          # Generate weight/measurements
│   │   └── RecipeSelector.ts             # Select from recipe library
│   └── utils/
│       ├── ApiClient.ts                  # HTTP client with auth
│       ├── StateManager.ts               # Cross-actor state sharing
│       └── DataPersistence.ts            # Save/load simulation state

FitnessMealPlanner/
├── vitest.config.ts                      # Fixed coverage configuration
├── playwright.simulation.config.ts       # Playwright E2E config
├── scripts/
│   └── seed-demo-data.ts                 # Enhanced seed script
└── tests/
    └── e2e/
        └── flows/
            └── 14-day-simulation.spec.ts # Main simulation test
```

## Components

### 1. BaseActor (Abstract Base Class)

**Purpose:** Foundation for all actor types with shared functionality.

**Properties:**
- `user: User` - User object with role, id, email
- `token: string` - JWT access token
- `role: 'nutritionist' | 'client' | 'admin'`
- `state: Map<string, any>` - Actor-specific state storage

**Methods:**
- `authenticate(): Promise<void>` - Login and store token
- `authenticatedRequest(method, path, body): Promise<Response>` - HTTP with auth
- `setState(key, value): void` - Store state
- `getState(key): any` - Retrieve state
- `clearState(): void` - Reset state

**Error Handling:**
- Auto-refresh token on 401
- Retry with exponential backoff on 5xx
- Throw `ActorError` with context on failure

### 2. NutritionistActor

**Purpose:** Simulates nutritionist creating and managing meal plans.

**Actions:**
```typescript
interface NutritionistActions {
  createMealPlan(data: MealPlanInput): Promise<MealPlan>
  assignMealPlan(planId: string, clientId: string): Promise<Assignment>
  reviewClientLog(clientId: string, date: string): Promise<NutritionLog>
  sendMessage(clientId: string, message: string): Promise<Message>
  viewClientProgress(clientId: string): Promise<ProgressReport>
  generateShoppingList(planId: string): Promise<ShoppingList>
  updateClientGoals(clientId: string, goals: NutritionGoals): Promise<void>
}
```

**14-Day Workflow:**
- Day 1: Create 2 meal plans, assign to clients
- Day 3: Review client logs, send feedback
- Day 7: Check progress, adjust plans if needed
- Day 14: Generate final progress report

### 3. ClientActor

**Purpose:** Simulates client logging nutrition and viewing progress.

**Actions:**
```typescript
interface ClientActions {
  logMeal(entry: NutritionEntry): Promise<NutritionLog>
  viewMealPlan(): Promise<MealPlan>
  viewProgress(): Promise<ProgressData>
  updateMeasurements(data: Measurements): Promise<void>
  sendMessage(nutritionistId: string, message: string): Promise<Message>
  viewRecipes(filters?: RecipeFilters): Promise<Recipe[]>
  favoriteRecipe(recipeId: string): Promise<void>
}
```

**14-Day Workflow:**
- Daily: Log 3-5 meals based on assigned plan
- Every 3 days: Update weight/measurements
- Weekly: View progress charts
- As needed: Browse recipes, send messages

### 4. FourteenDayWorkflow

**Purpose:** Orchestrates the complete 14-day simulation.

**Structure:**
```typescript
interface DaySchedule {
  day: number
  nutritionistTasks: Task[]
  clientTasks: Task[]
  expectedDataState: DataState
  validationCheckpoints: Checkpoint[]
}

class FourteenDayWorkflow {
  async run(config: SimulationConfig): Promise<SimulationResult>
  private async executeDay(schedule: DaySchedule): Promise<DayResult>
  private async validateState(expected: DataState): Promise<ValidationResult>
  private generateReport(results: DayResult[]): Promise<SimulationReport>
}
```

**Daily Routine:**
1. **Morning (Client)** - Log breakfast, view day's plan
2. **Midday (Client)** - Log lunch, check progress
3. **Evening (Client)** - Log dinner, snacks
4. **Review (Nutritionist)** - Check client logs, send feedback
5. **State Validation** - Verify data consistency

### 5. Data Generators

**MealPlanGenerator:**
```typescript
interface MealPlanInput {
  name: string
  durationDays: number
  dailyCalories: number
  macros: Macros
  restrictions: string[]
  preferences: string[]
}

// Generates realistic meal plans with variety
// Avoids repetitive meals, respects restrictions
```

**NutritionLogGenerator:**
```typescript
interface NutritionEntry {
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foods: FoodItem[]
  calories: number
  macros: Macros
  timestamp: Date
}

// Generates realistic daily logs
// 80% compliance with plan (realistic user behavior)
// Occasionally misses meals, adds treats
```

**ProgressGenerator:**
```typescript
interface ProgressData {
  weight: number        // Gradual changes, not linear
  bodyFat?: number      // Optional tracking
  measurements: BodyMeasurements
  energyLevel: 1-10     // Subjective rating
  adherence: 0-100      // Plan compliance %
}

// Realistic weight fluctuations
// Correlates with nutrition log adherence
```

## Data Flow

### Simulation Initialization

```
1. Create Actors
   ├─ NutritionistActor (2 nutritionists)
   ├─ ClientActor (5 clients)
   └─ AdminActor (1 admin)

2. Seed Initial Data
   ├─ Create nutritionist profiles
   ├─ Create client profiles
   ├─ Establish relationships
   └─ Generate initial meal plans

3. Initialize State
   ├─ Set starting weights/measurements
   ├─ Define nutrition goals
   └─ Assign meal plans
```

### Daily Simulation Loop

```
For each day (1-14):
  ├─ Execute Client Morning Routine
  │   ├─ Log breakfast (80% of days)
  │   ├─ View meal plan
  │   └─ Check notifications
  │
  ├─ Execute Client Midday Routine
  │   ├─ Log lunch
  │   └─ Log snacks
  │
  ├─ Execute Client Evening Routine
  │   ├─ Log dinner
  │   ├─ Update measurements (every 3 days)
  │   └─ View progress
  │
  ├─ Execute Nutritionist Review
  │   ├─ Review all client logs
  │   ├─ Send feedback messages
  │   └─ Adjust plans if needed
  │
  └─ Validate State
      ├─ Check data consistency
      ├─ Verify calculations
      └─ Log checkpoint
```

### Final Validation

```
1. Aggregate Statistics
   ├─ Total meals logged
   ├─ Average daily calories
   ├─ Weight changes per client
   ├─ Plan adherence rates
   └─ Message exchanges

2. Run E2E Assertions
   ├─ All clients have 14 days of logs
   ├─ Nutritionists reviewed all logs
   ├─ Progress charts render correctly
   ├─ Shopping lists generated
   └─ No data corruption

3. Generate Report
   ├─ Simulation timeline
   ├─ Data integrity check
   ├─ Performance metrics
   └─ Recommendations
```

## Error Handling

### Actor-Level Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Auth failure (401) | Auto-refresh token, retry once |
| Rate limiting (429) | Exponential backoff (1s, 2s, 4s) |
| Server error (5xx) | Retry 3x, then mark as failure |
| Validation error (400) | Log details, skip action, continue |
| Network timeout | Retry with increased timeout |

### Workflow-Level Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Actor creation fails | Abort simulation, report error |
| State validation fails | Log inconsistency, attempt recovery |
| Day execution fails | Retry day once, then continue to next |
| Final validation fails | Generate detailed error report |

### Recovery Mechanisms

```typescript
interface RecoveryStrategy {
  // On data inconsistency
  async reconcileState(): Promise<boolean>
  
  // On actor failure
  async spawnReplacement(actorType: string): Promise<Actor>
  
  // On network issues
  async pauseAndResume(delayMs: number): Promise<void>
}
```

## Testing Strategy

### Unit Tests
- Individual actor actions
- Data generator output validation
- State management
- Error handling paths

### Integration Tests
- Actor interactions
- API client with auth
- State persistence
- Workflow step sequencing

### E2E Tests (Playwright)
- Complete 14-day simulation
- UI validation at key checkpoints
- Screenshot comparison
- Performance metrics

### Coverage Requirements
- **Target:** 80% minimum
- **Critical paths:** 100% (actor creation, workflow orchestration)
- **Error handling:** All error paths tested

## Performance Requirements

| Metric | Target | Maximum |
|--------|--------|---------|
| Simulation duration | < 5 minutes | 10 minutes |
| API request latency | < 500ms | 2s |
| Actor initialization | < 2s | 5s |
| State validation | < 1s | 3s |
| Report generation | < 5s | 10s |

## Security Considerations

1. **Test Data Only** - Never use real user credentials
2. **Isolated Environment** - Run against staging by default
3. **Token Management** - Secure storage, auto-expiry
4. **Data Cleanup** - Delete all test data post-simulation
5. **Rate Limiting** - Respect API limits, use delays

## Implementation Phases

### Phase 1: Foundation (Day 1)
- Fix Vitest coverage configuration
- Create skill directory structure
- Implement BaseActor
- Create ApiClient utility

### Phase 2: Actors (Day 2)
- Implement NutritionistActor
- Implement ClientActor
- Implement AdminActor
- Unit tests for all actors

### Phase 3: Generators (Day 3)
- MealPlanGenerator
- NutritionLogGenerator
- ProgressGenerator
- RecipeSelector

### Phase 4: Workflow (Day 4)
- DailyRoutineWorkflow
- FourteenDayWorkflow
- State validation
- Error handling

### Phase 5: Integration (Day 5)
- E2E test suite
- Playwright integration
- Report generation
- Bug fixes

### Phase 6: Hardening (Day 6)
- Performance optimization
- Additional error handling
- Documentation
- Final validation

## Success Criteria

- [ ] Coverage reports accurate percentages (not 0%)
- [ ] Skill can be invoked from any session
- [ ] 14-day simulation completes in < 5 minutes
- [ ] All 10 critical platform flows validated
- [ ] Zero critical bugs remain
- [ ] Report generated with pass/fail status
- [ ] Documentation complete

## References

- FORGE Methodology: `docs/FORGE.md`
- Original User Simulation Skill: `~/Claude/second-brain/shared-skills/user-simulation/`
- EvoFit Demo Simulator: `.claude/skills/evofit-meals-demo-simulator/`
- Playwright Config: `playwright.simulation.config.ts`

## Appendix: Data Models

### Actor State
```typescript
interface ActorState {
  userId: string
  role: 'nutritionist' | 'client' | 'admin'
  token: string
  refreshToken: string
  tokenExpiry: Date
  state: Map<string, any>
  metrics: {
    requestsMade: number
    errorsEncountered: number
    lastActivity: Date
  }
}
```

### Simulation Config
```typescript
interface SimulationConfig {
  baseUrl: string
  durationDays: number
  actors: {
    nutritionists: number
    clients: number
    admins: number
  }
  options: {
    headless: boolean
    screenshots: boolean
    saveState: boolean
    parallel: boolean
  }
}
```

### Simulation Result
```typescript
interface SimulationResult {
  success: boolean
  duration: number
  daysCompleted: number
  actors: {
    created: number
    failed: number
  }
  data: {
    mealPlansCreated: number
    nutritionLogs: number
    messages: number
    progressUpdates: number
  }
  errors: SimulationError[]
  report: SimulationReport
}
```
