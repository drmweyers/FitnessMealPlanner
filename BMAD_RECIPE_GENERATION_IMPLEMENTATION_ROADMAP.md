# BMAD Multi-Agent Recipe Generation System
## Implementation Roadmap

**Created:** 2025-10-07
**Status:** IN PROGRESS - Phase 1
**Estimated Total Effort:** 5-7 development sessions

---

## Executive Summary

This document outlines the phased implementation of a BMAD (Business Metrics & Analytics Dashboard) multi-agent system for bulk recipe generation (10-30+ recipes). The system will use 5 specialized agents to handle concept generation, validation, image creation, database operations, and progress monitoring.

### Scope

- **Lines of Code:** ~3,500 new lines
- **Test Coverage:** ~2,000 test lines
- **Files Created:** 25+ new files
- **Files Modified:** 10+ existing files
- **Database Changes:** 1 new table, 2 new columns

### Success Metrics

- ✅ 30 recipes in < 3 minutes
- ✅ < 5 seconds per recipe (non-blocking)
- ✅ Real-time progress tracking
- ✅ 95%+ image uniqueness
- ✅ > 95% test coverage

---

## Phase 1: Core Agent Infrastructure (Session 1-2)

**Status:** 🟡 IN PROGRESS
**Priority:** CRITICAL
**Estimated Time:** 2-3 hours

### Deliverables

#### 1.1 Shared Types & Interfaces ✅
- [x] `server/services/agents/types.ts` - Core types for all agents

#### 1.2 Base Agent Class
- [ ] `server/services/agents/BaseAgent.ts` - Abstract base class
  - Agent lifecycle management
  - Error handling
  - Metrics tracking
  - Communication protocol

#### 1.3 Recipe Concept Agent (Planner)
- [ ] `server/services/agents/RecipeConceptAgent.ts`
  - Analyze user requirements
  - Create chunking strategy
  - Generate recipe concepts
  - Diversity enforcement

#### 1.4 Progress Monitor Agent (Reporter)
- [ ] `server/services/agents/ProgressMonitorAgent.ts`
  - Real-time state tracking
  - WebSocket/polling support
  - Error aggregation
  - Time estimation

#### 1.5 Basic Coordinator
- [ ] `server/services/agents/BMADCoordinator.ts`
  - Agent orchestration
  - Message routing
  - Error recovery
  - Batch ID management

### Testing
- [ ] `test/unit/services/agents/types.test.ts`
- [ ] `test/unit/services/agents/BaseAgent.test.ts`
- [ ] `test/unit/services/agents/RecipeConceptAgent.test.ts`
- [ ] `test/unit/services/agents/ProgressMonitorAgent.test.ts`

### Acceptance Criteria
- [ ] All agent types compile without errors
- [ ] Base agent lifecycle works
- [ ] Concept agent generates valid strategies
- [ ] Progress monitor tracks state accurately

---

## Phase 2: Validation & Database Agents (Session 2-3)

**Status:** ⚪ NOT STARTED
**Priority:** HIGH
**Estimated Time:** 2-3 hours

### Deliverables

#### 2.1 Nutritional Validator Agent
- [ ] `server/services/agents/NutritionalValidatorAgent.ts`
  - Validate nutrition data
  - Check macro ranges
  - Ingredient validation
  - Auto-fix common issues

#### 2.2 Database Orchestrator Agent
- [ ] `server/services/agents/DatabaseOrchestratorAgent.ts`
  - Transaction management
  - Batch inserts
  - Rollback on failure
  - Duplicate detection

#### 2.3 Enhanced Recipe Generator Service
- [ ] Modify `server/services/recipeGenerator.ts`
  - Integrate BMAD coordinator
  - Add chunked generation
  - Progress callbacks
  - Error recovery

### Testing
- [ ] `test/unit/services/agents/NutritionalValidatorAgent.test.ts`
- [ ] `test/unit/services/agents/DatabaseOrchestratorAgent.test.ts`
- [ ] `test/integration/bmad-basic-workflow.test.ts`

### Acceptance Criteria
- [ ] Validator catches invalid nutrition data
- [ ] Database agent handles transactions properly
- [ ] Enhanced recipe generator uses agents
- [ ] Basic 5-recipe generation works end-to-end

---

## Phase 3: Image Generation & Uniqueness (Session 3-4)

**Status:** ⚪ NOT STARTED
**Priority:** HIGH
**Estimated Time:** 2-3 hours

### Deliverables

#### 3.1 Image Generation Agent
- [ ] `server/services/agents/ImageGenerationAgent.ts`
  - DALL-E 3 integration
  - Prompt engineering
  - Quality validation
  - Retry logic

#### 3.2 Image Uniqueness System
- [ ] `server/services/imageUniquenessValidator.ts`
  - Perceptual hashing
  - Similarity detection
  - Cache management
- [ ] `server/services/imageQualityChecker.ts`
  - Quality scoring
  - Format validation
  - Size checks

#### 3.3 Database Schema
- [ ] `migrations/0018_recipe_image_metadata.sql`
```sql
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

### Testing
- [ ] `test/unit/services/agents/ImageGenerationAgent.test.ts`
- [ ] `test/unit/services/imageUniquenessValidator.test.ts`
- [ ] `test/integration/bmad-image-uniqueness.test.ts`

### Acceptance Criteria
- [ ] Images generated for all recipes
- [ ] No duplicate images in same batch
- [ ] Quality scores > 80 for 95% of images
- [ ] Placeholder fallback works

---

## Phase 4: Progress Visualization (Session 4-5)

**Status:** ⚪ NOT STARTED
**Priority:** HIGH
**Estimated Time:** 2-3 hours

### Deliverables

#### 4.1 Progress Tracking Hook
- [ ] `client/src/hooks/useRecipeGenerationProgress.ts`
  - WebSocket/polling connection
  - State management
  - Real-time updates

#### 4.2 Progress Components
- [ ] `client/src/components/RecipeGenerationProgress.tsx`
  - Overall progress bar
  - Phase indicators
  - Time remaining
- [ ] `client/src/components/BMADAgentStatusCard.tsx`
  - Agent status grid
  - Visual indicators
  - Error display
- [ ] `client/src/components/ChunkProgressIndicator.tsx`
  - Chunk-by-chunk progress
  - Success/failure badges

#### 4.3 Modal Integration
- [ ] Modify `client/src/components/RecipeGenerationModal.tsx`
  - Use new progress components
  - Agent status display
  - Error recovery UI

### Testing
- [ ] `test/unit/hooks/useRecipeGenerationProgress.test.ts`
- [ ] `test/unit/components/RecipeGenerationProgress.test.tsx`
- [ ] `test/e2e/recipe-generation-progress.spec.ts`

### Acceptance Criteria
- [ ] Real-time progress updates (< 500ms latency)
- [ ] All 5 agent statuses visible
- [ ] Chunk progress shows accurately
- [ ] Time estimates within 10% accuracy

---

## Phase 5: API Endpoints & Integration (Session 5-6)

**Status:** ⚪ NOT STARTED
**Priority:** HIGH
**Estimated Time:** 2 hours

### Deliverables

#### 5.1 Admin API Endpoints
- [ ] Modify `server/routes/adminRoutes.ts`
```typescript
POST   /api/admin/generate-bulk
GET    /api/admin/generation-progress/:batchId
POST   /api/admin/retry-chunk/:batchId/:chunkIndex
GET    /api/admin/agent-status/:batchId
DELETE /api/admin/cancel-generation/:batchId
```

#### 5.2 WebSocket Support (Optional)
- [ ] `server/services/WebSocketProgressBroadcaster.ts`
  - Real-time progress broadcast
  - Client subscription management
  - Automatic cleanup

#### 5.3 Frontend Integration
- [ ] Modify `client/src/components/AdminRecipeGenerator.tsx`
  - Use new API endpoints
  - Add bulk buttons (10, 20, 30)
  - Show agent status
- [ ] Modify `client/src/components/MealPlanGenerator.tsx`
  - Natural language + BMAD
  - Progress integration

### Testing
- [ ] `test/integration/bmad-api-endpoints.test.ts`
- [ ] `test/e2e/bulk-generation-10-20-30.spec.ts`

### Acceptance Criteria
- [ ] All API endpoints functional
- [ ] Both generation methods use BMAD
- [ ] 10, 20, 30 recipe batches complete successfully
- [ ] WebSocket updates work (if implemented)

---

## Phase 6: Comprehensive Testing & Optimization (Session 6-7)

**Status:** ⚪ NOT STARTED
**Priority:** CRITICAL
**Estimated Time:** 2-3 hours

### Deliverables

#### 6.1 Performance Testing
- [ ] `test/performance/bmad-bulk-generation.perf.ts`
  - 30 recipes < 3 minutes
  - < 5 seconds per recipe average
  - Memory usage < 500MB

#### 6.2 Stress Testing
- [ ] `test/stress/concurrent-generation.stress.ts`
  - 5 concurrent users
  - 10 recipes each
  - No race conditions

#### 6.3 Error Recovery Testing
- [ ] `test/integration/bmad-error-recovery.test.ts`
  - OpenAI timeout recovery
  - Database failure handling
  - Image generation failures
  - Partial batch success

#### 6.4 Optimization
- [ ] Database query optimization
- [ ] Caching strategies
- [ ] Connection pooling
- [ ] Memory leak detection

### Testing
- [ ] All unit tests pass (> 95% coverage)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Performance benchmarks met

### Acceptance Criteria
- [ ] 100% of acceptance criteria met
- [ ] Performance targets exceeded
- [ ] No memory leaks detected
- [ ] Error recovery reliable

---

## Implementation Guidelines

### Code Quality Standards

1. **TypeScript**
   - Strict mode enabled
   - No `any` types (use `unknown` or proper interfaces)
   - All functions have return type annotations
   - JSDoc comments for complex logic

2. **Testing**
   - Each agent has dedicated test file
   - Mock external dependencies (OpenAI, S3, DB)
   - Test happy path + 5 error scenarios per feature
   - Integration tests for agent coordination

3. **Documentation**
   - Inline code comments for complex logic
   - API documentation for new endpoints
   - Migration guide from old system
   - Performance tuning guide

### Error Handling

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

### Performance Targets

- **Recipe Generation:** < 5 seconds per recipe (non-blocking)
- **Chunk Processing:** < 30 seconds per 5-recipe chunk
- **Progress Updates:** Real-time via WebSocket or polling (500ms interval)
- **Image Generation:** Background, non-blocking (< 60s timeout)
- **Database Operations:** < 2 seconds per recipe save
- **Overall Throughput:** 30 recipes in < 3 minutes

---

## Migration Strategy

### Backward Compatibility

1. **Phase 1-3:** New BMAD system runs alongside old system
2. **Feature Flag:** `ENABLE_BMAD_GENERATION=true` in .env
3. **A/B Testing:** Admin users test first
4. **Gradual Rollout:** Monitor performance and errors
5. **Full Migration:** Remove old code after 2 weeks of stability

### Rollback Plan

1. Set `ENABLE_BMAD_GENERATION=false`
2. Old system continues to work
3. No data loss (BMAD writes to same tables)
4. Fix issues and re-enable

---

## Success Metrics

### Performance ✅

- [ ] 30 recipes generated in < 3 minutes
- [ ] < 5 seconds per recipe (non-blocking)
- [ ] 99.9% success rate for recipe saves
- [ ] 95%+ success rate for image generation

### User Experience ✅

- [ ] Real-time progress updates (< 500ms latency)
- [ ] Clear error messages with retry options
- [ ] Mobile-responsive progress UI
- [ ] No UI freezing during generation

### Code Quality ✅

- [ ] > 95% test coverage
- [ ] 0 TypeScript errors
- [ ] All E2E tests passing
- [ ] < 5 linting warnings

---

## Current Status

**Phase 1 Progress:**
- ✅ Shared types created (`server/services/agents/types.ts`)
- ⏳ Base agent class (next)
- ⏳ Recipe Concept Agent
- ⏳ Progress Monitor Agent
- ⏳ Basic Coordinator

**Blockers:** None

**Next Actions:**
1. Create BaseAgent abstract class
2. Implement Recipe Concept Agent
3. Implement Progress Monitor Agent
4. Create basic coordinator
5. Write unit tests for all agents

---

## Notes

- This is a production system used by real fitness trainers
- Prioritize reliability over features
- User transparency is critical
- Comprehensive testing before deployment
- Each phase should be fully tested before moving to next

---

## References

- **Current Implementation:** `server/services/recipeGenerator.ts`
- **OpenAI Integration:** `server/services/openai.ts`
- **Previous Work:** `BMAD_SESSION_OCTOBER_6_2025_RECIPE_GENERATION_FIX.md`
- **Test Examples:** `test/unit/services/recipeGenerator.nonblocking.test.ts`
