# Claude Code Prompt: Enhanced AI Meal Generation System with BMAD Multi-Agent Workflow

## Project Context

You are enhancing the **FitnessMealPlanner** application - a production-ready fitness meal planning platform built with React, TypeScript, Express.js, and PostgreSQL. The current recipe generation system has been improved from a blocking architecture to non-blocking (see `BMAD_SESSION_OCTOBER_6_2025_RECIPE_GENERATION_FIX.md`), but needs further enhancement for large-scale bulk operations (10-30+ recipes).

## Current System Analysis

### Existing Architecture
- **Backend**: `server/services/recipeGenerator.ts` - Non-blocking recipe processing with placeholder images
- **Frontend Components**: 
  - `client/src/components/RecipeGenerationModal.tsx` - Context-aware modal for meal plan generation
  - `client/src/components/AdminRecipeGenerator.tsx` - Admin quick generator with progress tracking
  - `client/src/components/MealPlanGenerator.tsx` - Natural language + form-based meal plan generator
- **AI Service**: `server/services/openai.ts` - OpenAI GPT-4 integration with 2-minute timeout
- **Testing**: Comprehensive test suite in `test/unit/services/recipeGenerator.nonblocking.test.ts`

### Current Strengths ✅
1. **Non-Blocking Architecture**: Recipes save immediately (< 5s) with placeholder images
2. **Background Image Generation**: DALL-E 3 images generate asynchronously
3. **Real Progress Tracking**: Frontend tracks actual recipe saves, not fake timers
4. **Graceful Degradation**: Image failures don't block recipe saves
5. **Comprehensive Testing**: 29/29 unit tests passing, 6 E2E Playwright tests

### Current Limitations ❌
1. **No Chunking**: Large batches (10-30 recipes) processed as single OpenAI call → timeouts
2. **Limited Progress Visibility**: Users can't see granular progress for multi-chunk operations
3. **No Image Uniqueness Guarantee**: Placeholder-first approach means initial images aren't unique
4. **Single-Agent Workflow**: No specialized agents for generation, validation, image creation
5. **No Bulk Generation Queue**: Large operations don't use review/approval workflow

## Mission: Create Enhanced Multi-Agent BMAD Meal Generation System

### Core Requirements

#### 1. Multi-Agent BMAD Workflow Architecture
Implement a BMAD (Business Metrics & Analytics Dashboard) multi-agent system with specialized agents:

**Agent 1: Recipe Concept Agent** (Planner)
- Analyzes user requirements (natural language + form data)
- Creates recipe generation strategy
- Determines optimal chunking (5 recipes per chunk)
- Generates diverse recipe concepts

**Agent 2: Nutritional Validator Agent** (Validator)
- Validates nutritional data accuracy
- Ensures macros meet user constraints
- Checks ingredient combinations
- Validates prep/cook time estimates

**Agent 3: Image Generation Agent** (Artist)
- Generates unique, accurate food images
- Ensures images match recipe descriptions
- Validates image quality
- Manages S3 upload with retry logic

**Agent 4: Database Orchestrator Agent** (Coordinator)
- Manages recipe save operations
- Handles transaction rollback on failures
- Coordinates agent communication
- Tracks overall progress

**Agent 5: Progress Monitor Agent** (Reporter)
- Real-time progress updates to frontend
- Granular status for each chunk
- Error tracking and reporting
- Performance metrics collection

#### 2. Chunked Processing System
```typescript
// Implement in server/services/recipeGenerator.ts

interface ChunkStrategy {
  totalRecipes: number;
  chunkSize: number; // Default: 5
  chunks: number;
  estimatedTime: number;
}

class RecipeGeneratorServiceEnhanced {
  async generateRecipesInChunks(
    options: GenerationOptions
  ): Promise<ChunkedGenerationResult> {
    // 1. Recipe Concept Agent determines strategy
    const strategy = await this.planGeneration(options);
    
    // 2. Process each chunk with progress updates
    for (let i = 0; i < strategy.chunks; i++) {
      // 3. Generate chunk with Concept Agent
      const concepts = await this.generateChunk(i, strategy);
      
      // 4. Validate with Nutritional Validator Agent
      const validated = await this.validateChunk(concepts);
      
      // 5. Save immediately with Database Orchestrator Agent
      const saved = await this.saveChunk(validated);
      
      // 6. Queue images with Image Generation Agent
      await this.queueImageGeneration(saved);
      
      // 7. Report progress with Progress Monitor Agent
      await this.reportProgress(i, strategy, saved);
    }
  }
}
```

#### 3. Enhanced Progress Visualization
Create real-time, transparent progress tracking:

**Frontend: `client/src/components/RecipeGenerationProgress.tsx` (NEW)**
```typescript
interface ProgressState {
  phase: 'planning' | 'generating' | 'validating' | 'saving' | 'imaging' | 'complete';
  currentChunk: number;
  totalChunks: number;
  recipesCompleted: number;
  totalRecipes: number;
  imagesGenerated: number;
  errors: string[];
  estimatedTimeRemaining: number;
  agentStatus: {
    concept: AgentStatus;
    validator: AgentStatus;
    artist: AgentStatus;
    coordinator: AgentStatus;
    monitor: AgentStatus;
  };
}

// Visual Components:
// - Overall progress bar (0-100%)
// - Chunk-by-chunk breakdown
// - Agent status indicators (idle/working/complete/error)
// - Real-time recipe counter
// - Image generation progress
// - Estimated time remaining
// - Error log with retry options
```

#### 4. Image Uniqueness & Accuracy System
Ensure each recipe has a unique, representative image:

**Image Generation Service Enhancement**
```typescript
// In server/services/imageGenerator.ts (NEW)

class ImageGenerationService {
  async generateUniqueRecipeImage(
    recipe: GeneratedRecipe,
    context: ImageGenerationContext
  ): Promise<UniqueImage> {
    // 1. Generate detailed DALL-E prompt from recipe
    const prompt = this.createDetailedPrompt(recipe);
    
    // 2. Check for similar images in cache
    const isDuplicate = await this.checkImageUniqueness(prompt);
    if (isDuplicate) {
      // Regenerate with variation
      prompt = this.addVariation(prompt);
    }
    
    // 3. Generate image with quality validation
    const image = await this.generateWithQualityCheck(prompt);
    
    // 4. Store with metadata for uniqueness tracking
    await this.storeImageMetadata(image, recipe);
    
    return image;
  }
}
```

#### 5. Comprehensive Testing Framework
Extend existing test suite with BMAD agent testing:

**New Test Files:**
- `test/unit/services/multiAgentRecipeGeneration.test.ts`
- `test/unit/services/chunkingStrategy.test.ts`
- `test/unit/services/imageUniqueness.test.ts`
- `test/e2e/bulk-generation-10-20-30-recipes.spec.ts`
- `test/integration/bmad-agent-coordination.test.ts`

**Test Coverage Requirements:**
- ✅ Chunk generation (1-30 recipes in chunks of 5)
- ✅ Agent coordination and communication
- ✅ Progress tracking accuracy
- ✅ Image uniqueness validation
- ✅ Error recovery and retry logic
- ✅ Performance benchmarks (< 5s per recipe)
- ✅ Concurrent generation handling

#### 6. Natural Language & Quick Generation Integration
Ensure both generation methods use the enhanced system:

**Natural Language Generation** (`MealPlanGenerator.tsx`)
- Parse user input → Recipe Concept Agent
- Extract constraints → Nutritional Validator Agent
- Generate with progress visualization
- Support "Generate 20 high-protein breakfast recipes with eggs"

**Quick Generation** (`AdminRecipeGenerator.tsx`)
- Form-based constraints → direct to agents
- Bulk generate buttons (5, 10, 20, 30 recipes)
- Real-time progress cards
- Retry failed chunks

## Implementation Plan

### Phase 1: Core BMAD Agent System (Priority: CRITICAL)
**Files to Create:**
1. `server/services/agents/RecipeConceptAgent.ts`
2. `server/services/agents/NutritionalValidatorAgent.ts`
3. `server/services/agents/ImageGenerationAgent.ts`
4. `server/services/agents/DatabaseOrchestratorAgent.ts`
5. `server/services/agents/ProgressMonitorAgent.ts`
6. `server/services/agents/BMADCoordinator.ts`

**Files to Enhance:**
1. `server/services/recipeGenerator.ts` - Add chunking and agent orchestration
2. `server/services/openai.ts` - Add chunk-based generation methods
3. `server/services/imageGenerator.ts` - NEW: Separate image generation logic

### Phase 2: Progress Visualization (Priority: HIGH)
**Files to Create:**
1. `client/src/components/RecipeGenerationProgress.tsx`
2. `client/src/components/BMADAgentStatusCard.tsx`
3. `client/src/components/ChunkProgressIndicator.tsx`
4. `client/src/hooks/useRecipeGenerationProgress.ts`

**Files to Enhance:**
1. `client/src/components/RecipeGenerationModal.tsx` - Integrate enhanced progress
2. `client/src/components/AdminRecipeGenerator.tsx` - Add BMAD agent status

### Phase 3: Image Uniqueness System (Priority: HIGH)
**Files to Create:**
1. `server/services/imageUniquenessValidator.ts`
2. `server/services/imageQualityChecker.ts`
3. `server/utils/imageCache.ts`

**Database Schema Addition:**
```sql
-- Add to migrations/
CREATE TABLE recipe_image_metadata (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  dalle_prompt TEXT NOT NULL,
  similarity_hash TEXT NOT NULL,
  generation_timestamp TIMESTAMP DEFAULT NOW(),
  quality_score DECIMAL(3,2),
  is_placeholder BOOLEAN DEFAULT false
);

CREATE INDEX idx_similarity_hash ON recipe_image_metadata(similarity_hash);
```

### Phase 4: Enhanced Testing (Priority: CRITICAL)
**Files to Create:**
1. `test/unit/services/multiAgentRecipeGeneration.test.ts`
2. `test/e2e/bulk-generation-stress-test.spec.ts`
3. `test/integration/bmad-agent-coordination.test.ts`
4. `test/helpers/recipeGenerationHelpers.ts`

**Coverage Goals:**
- Unit tests: > 95% coverage for agent modules
- Integration tests: All 5 agents working together
- E2E tests: 10, 20, 30 recipe generation scenarios
- Performance tests: < 5s per recipe average

### Phase 5: API & Frontend Integration (Priority: HIGH)
**API Endpoints to Add:**
```typescript
// In server/routes/adminRoutes.ts
POST /api/admin/generate-bulk
  - Body: { count: number, options: GenerationOptions }
  - Response: { batchId: string, strategy: ChunkStrategy }

GET /api/admin/generation-progress/:batchId
  - Response: ProgressState (real-time)

POST /api/admin/retry-chunk/:batchId/:chunkIndex
  - Retry failed chunk

GET /api/admin/agent-status/:batchId
  - Response: Current agent states
```

## Technical Specifications

### Agent Communication Protocol
```typescript
interface AgentMessage {
  fromAgent: AgentType;
  toAgent: AgentType;
  messageType: 'request' | 'response' | 'status' | 'error';
  payload: any;
  timestamp: Date;
  correlationId: string; // For tracking multi-step operations
}

interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  nextAgent?: AgentType;
  requiresHumanReview?: boolean;
}
```

### Performance Requirements
- **Recipe Generation**: < 5 seconds per recipe (non-blocking)
- **Chunk Processing**: < 30 seconds per 5-recipe chunk
- **Progress Updates**: Real-time via WebSocket or polling (500ms interval)
- **Image Generation**: Background, non-blocking (< 60s timeout)
- **Database Operations**: < 2 seconds per recipe save
- **Overall Throughput**: 30 recipes in < 3 minutes

### Error Handling & Resilience
```typescript
interface ErrorRecoveryStrategy {
  retryLimit: number;
  backoffMs: number;
  fallbackBehavior: 'placeholder' | 'skip' | 'queue_manual_review';
  notifyUser: boolean;
}

// Per Agent:
- Recipe Concept Agent: Retry up to 2 times, notify on failure
- Nutritional Validator: Auto-fix common issues, flag outliers
- Image Generation Agent: Use placeholder on failure, queue retry
- Database Orchestrator: Transaction rollback, retry on deadlock
- Progress Monitor: Never fail, always report (even errors)
```

### Data Flow Architecture
```
User Input (NL + Form)
    ↓
Recipe Concept Agent
    ↓ (chunk strategy)
For Each Chunk:
    ↓
  Concept Agent → Batch of 5 recipes
    ↓
  Nutritional Validator → Validated recipes
    ↓
  Database Orchestrator → Saved recipes (with placeholders)
    ↓
  Progress Monitor → Update frontend (X/Y saved)
    ↓
  Image Generation Agent → Background image queue
    ↓
  (async) Generate images → Update recipes
    ↓
  Progress Monitor → Update frontend (X/Y images ready)
    ↓
Complete → Show final results
```

## UI/UX Requirements

### Progress Visualization Wireframe
```
┌─────────────────────────────────────────────────────────┐
│  Recipe Generation in Progress                          │
│                                                          │
│  Overall Progress: 15/30 recipes (50%)                  │
│  [████████████████░░░░░░░░░░░░░░░] 50%                 │
│                                                          │
│  Current Phase: Validating Recipes                      │
│  Chunk 3 of 6 • Est. 2:15 remaining                    │
│                                                          │
│  ┌───────────────────────────────────────────────┐     │
│  │ 🧠 Recipe Concept Agent     [✓ Complete]      │     │
│  │ ✅ Nutritional Validator    [⚙️  Working]     │     │
│  │ 🎨 Image Artist            [⏸️  Queued]      │     │
│  │ 💾 Database Coordinator    [⚙️  Working]     │     │
│  │ 📊 Progress Monitor         [⚙️  Active]      │     │
│  └───────────────────────────────────────────────┘     │
│                                                          │
│  Chunk Details:                                          │
│  ├─ Chunk 1: ✓ 5/5 saved, 3/5 images ready            │
│  ├─ Chunk 2: ✓ 5/5 saved, 5/5 images ready            │
│  ├─ Chunk 3: ⚙️  3/5 saved, 0/5 images                │
│  ├─ Chunk 4: ⏸️  Queued                                │
│  ├─ Chunk 5: ⏸️  Queued                                │
│  └─ Chunk 6: ⏸️  Queued                                │
│                                                          │
│  [View Completed Recipes] [Cancel]                      │
└─────────────────────────────────────────────────────────┘
```

### Error State Wireframe
```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ Recipe Generation - Partial Success                │
│                                                          │
│  Completed: 22/30 recipes (73%)                         │
│  [████████████████████░░░░░░░░] 73%                     │
│                                                          │
│  Issues Detected:                                        │
│  ├─ ❌ Chunk 4: OpenAI timeout (5 recipes lost)        │
│  ├─ ⚠️  Chunk 5: 2/5 recipes failed validation         │
│  └─ ⚠️  15 images still generating in background       │
│                                                          │
│  [Retry Failed Chunks] [Use What Worked] [Start Over]  │
└─────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

### Must Have ✅
1. **Bulk generation of 10, 20, 30 recipes completes successfully**
   - All recipes saved to database
   - Progress visible throughout
   - < 5 minutes for 30 recipes

2. **Real-time progress tracking**
   - User sees exact count (X/Y recipes)
   - Agent status visible
   - Chunk-by-chunk progress
   - Accurate time estimates

3. **Image uniqueness guaranteed**
   - Each recipe has distinct image
   - Images accurately represent recipe
   - No duplicate images in same batch
   - Quality validation before storage

4. **BMAD multi-agent workflow operational**
   - All 5 agents coordinating properly
   - Agent communication trackable
   - Error recovery per agent
   - Performance metrics collected

5. **Comprehensive testing**
   - 100% unit test coverage for agents
   - Integration tests for full workflow
   - E2E tests for 10/20/30 recipe scenarios
   - Performance benchmarks met

6. **Works with both generation methods**
   - Natural language generation
   - Quick form-based generation
   - Consistent UX across both

### Should Have 🎯
1. WebSocket-based real-time updates
2. Retry mechanism for failed chunks
3. Manual review queue for large batches
4. Image regeneration on user request
5. Bulk export of generated recipes
6. Performance analytics dashboard

### Could Have 💡
1. AI-powered recipe variation generator
2. Multi-user concurrent generation
3. Recipe template system
4. Batch scheduling (generate overnight)
5. A/B testing for prompt variations

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` or proper interfaces)
- All functions have return type annotations
- JSDoc comments for complex logic

### Testing
- Each agent has dedicated test file
- Mock external dependencies (OpenAI, S3, DB)
- Test happy path + 5 error scenarios per feature
- Performance tests for bulk operations
- Integration tests for agent coordination

### Documentation
- README update with BMAD architecture
- Inline code comments for complex logic
- API documentation for new endpoints
- Migration guide from old system
- Performance tuning guide

## Migration Strategy

### Phase 1: Backward Compatible (Week 1)
- Add new agent system alongside existing code
- Flag to enable/disable BMAD workflow
- A/B test with small batches (5 recipes)

### Phase 2: Gradual Rollout (Week 2)
- Enable for admin users first
- Monitor performance and errors
- Optimize based on real usage data

### Phase 3: Full Migration (Week 3)
- Enable for all users
- Remove old non-chunked code
- Update documentation

## Success Metrics

### Performance
- ✅ 30 recipes generated in < 3 minutes
- ✅ < 5 seconds per recipe (non-blocking)
- ✅ 99.9% success rate for recipe saves
- ✅ 95%+ success rate for image generation

### User Experience
- ✅ Real-time progress updates (< 500ms latency)
- ✅ Clear error messages with retry options
- ✅ Mobile-responsive progress UI
- ✅ No UI freezing during generation

### Code Quality
- ✅ > 95% test coverage
- ✅ 0 TypeScript errors
- ✅ All E2E tests passing
- ✅ < 5 linting warnings

## Context Files to Reference

### Existing Implementation
1. `server/services/recipeGenerator.ts` - Current non-blocking architecture
2. `server/services/openai.ts` - OpenAI integration with timeout
3. `client/src/components/RecipeGenerationModal.tsx` - Progress tracking UI
4. `client/src/components/MealPlanGenerator.tsx` - Natural language generator
5. `test/unit/services/recipeGenerator.nonblocking.test.ts` - Test examples

### Session Documentation
1. `BMAD_SESSION_OCTOBER_6_2025_RECIPE_GENERATION_FIX.md` - Previous fixes
2. `RECIPE_GENERATION_FIX_SUMMARY.md` - Non-blocking summary
3. `RECIPE_GENERATION_TIMEOUT_FIX_SUMMARY.md` - Timeout handling
4. `BMAD_RECIPE_IMAGE_UNIQUENESS_FIX.md` - Image uniqueness context

### BMAD Core
1. `.bmad-core/index.ts` - BMAD integration patterns
2. `.bmad-core/strategy/BusinessStrategyEngine.ts` - Strategy engine example
3. `.bmad-core/automation/WorkflowEngine.ts` - Workflow patterns

## Environment Setup

Ensure these are configured:
```bash
# OpenAI
OPENAI_API_KEY=<key>

# S3 / DigitalOcean Spaces
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_ENDPOINT=https://tor1.digitaloceanspaces.com
S3_BUCKET_NAME=pti
AWS_REGION=tor1

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fitmeal

# Optional: WebSocket for real-time updates
ENABLE_WEBSOCKET_PROGRESS=true
```

## Final Notes

This is a **production system** used by real fitness trainers and clients. Prioritize:
1. **Reliability** over features
2. **User transparency** over speed
3. **Error recovery** over perfect execution
4. **Comprehensive testing** before deployment

The goal is to create a robust, scalable, and user-friendly bulk recipe generation system that leverages BMAD multi-agent workflows to handle 10-30 recipe batches with full transparency, unique images, and comprehensive error handling.

---

**Ready to implement?** Start with Phase 1 (BMAD Agent System), then proceed sequentially through phases. Each phase should be fully tested before moving to the next.
