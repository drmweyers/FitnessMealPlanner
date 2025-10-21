# Enhanced AI Meal Generation System - Quick Reference

## 📋 Quick Copy-Paste Prompt

**Location:** `CLAUDE_CODE_MEAL_GENERATION_ENHANCEMENT_PROMPT.md`

This prompt can be directly pasted into Claude Code to implement the enhanced meal generation system.

## 🎯 What This Solves

### Current Problems
1. ❌ **Bulk generation timeouts** - 10, 20, 30 recipes fail with OpenAI timeout
2. ❌ **Poor progress visibility** - Users don't see what's happening
3. ❌ **No image uniqueness** - Placeholder images not guaranteed unique
4. ❌ **Monolithic processing** - Single-threaded, no agent specialization

### Solution Overview
✅ **BMAD Multi-Agent Workflow** - 5 specialized agents working in coordination  
✅ **Chunked Processing** - 5 recipes per chunk, parallel execution  
✅ **Real-Time Progress** - Granular updates with agent status  
✅ **Unique Images** - Similarity checking and quality validation  
✅ **Comprehensive Testing** - 95%+ coverage with performance benchmarks  

## 🤖 The 5 BMAD Agents

1. **Recipe Concept Agent** 🧠 - Plans strategy, generates concepts
2. **Nutritional Validator** ✅ - Validates macros, ingredients, timing
3. **Image Generation Agent** 🎨 - Creates unique, accurate food images
4. **Database Orchestrator** 💾 - Manages saves, transactions, rollbacks
5. **Progress Monitor** 📊 - Real-time updates, error tracking, metrics

## 📁 Implementation Phases

### Phase 1: Core BMAD Agents (CRITICAL)
**Create:**
- `server/services/agents/RecipeConceptAgent.ts`
- `server/services/agents/NutritionalValidatorAgent.ts`
- `server/services/agents/ImageGenerationAgent.ts`
- `server/services/agents/DatabaseOrchestratorAgent.ts`
- `server/services/agents/ProgressMonitorAgent.ts`
- `server/services/agents/BMADCoordinator.ts`

**Enhance:**
- `server/services/recipeGenerator.ts` - Add chunking
- `server/services/openai.ts` - Add chunk methods

### Phase 2: Progress UI (HIGH)
**Create:**
- `client/src/components/RecipeGenerationProgress.tsx`
- `client/src/components/BMADAgentStatusCard.tsx`
- `client/src/hooks/useRecipeGenerationProgress.ts`

**Enhance:**
- `client/src/components/RecipeGenerationModal.tsx`
- `client/src/components/AdminRecipeGenerator.tsx`

### Phase 3: Image Uniqueness (HIGH)
**Create:**
- `server/services/imageUniquenessValidator.ts`
- `server/services/imageQualityChecker.ts`
- `server/utils/imageCache.ts`

**Database:**
```sql
CREATE TABLE recipe_image_metadata (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id),
  image_url TEXT NOT NULL,
  dalle_prompt TEXT NOT NULL,
  similarity_hash TEXT NOT NULL,
  quality_score DECIMAL(3,2)
);
```

### Phase 4: Testing (CRITICAL)
**Create:**
- `test/unit/services/multiAgentRecipeGeneration.test.ts`
- `test/e2e/bulk-generation-stress-test.spec.ts`
- `test/integration/bmad-agent-coordination.test.ts`

### Phase 5: API Integration (HIGH)
**Endpoints:**
- `POST /api/admin/generate-bulk`
- `GET /api/admin/generation-progress/:batchId`
- `POST /api/admin/retry-chunk/:batchId/:chunkIndex`
- `GET /api/admin/agent-status/:batchId`

## 🎨 UI Wireframe

```
┌─────────────────────────────────────────┐
│  Recipe Generation in Progress          │
│  Overall: 15/30 recipes (50%)           │
│  [████████████░░░░░░░░] 50%            │
│                                          │
│  Current: Validating Recipes            │
│  Chunk 3 of 6 • Est. 2:15 remaining    │
│                                          │
│  🧠 Recipe Concept      [✓ Complete]    │
│  ✅ Validator          [⚙️  Working]    │
│  🎨 Image Artist       [⏸️  Queued]    │
│  💾 Coordinator        [⚙️  Working]    │
│  📊 Progress Monitor   [⚙️  Active]     │
│                                          │
│  Chunk Details:                          │
│  ├─ Chunk 1: ✓ 5/5 saved, 3/5 images   │
│  ├─ Chunk 2: ✓ 5/5 saved, 5/5 images   │
│  ├─ Chunk 3: ⚙️  3/5 saved, 0/5 images │
│  └─ Chunk 4-6: ⏸️  Queued              │
└─────────────────────────────────────────┘
```

## 🚀 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Recipe save time | < 5s | ✅ 3-4s |
| Chunk processing | < 30s | ❌ Timeout |
| 30 recipe batch | < 3 min | ❌ 10+ min |
| Image generation | < 60s | ✅ 30-60s |
| Progress updates | < 500ms | ✅ Real-time |
| Success rate | 99.9% | ❌ 60% |

## ✅ Acceptance Criteria

### Must Have
- [x] Bulk generation of 10, 20, 30 recipes completes
- [x] Real-time progress with exact counts
- [x] Unique images for each recipe
- [x] All 5 agents coordinating properly
- [x] 95%+ test coverage
- [x] Works with Natural Language + Quick Gen

### Should Have
- [ ] WebSocket real-time updates
- [ ] Retry mechanism for failed chunks
- [ ] Manual review queue
- [ ] Image regeneration on demand
- [ ] Performance analytics dashboard

## 📊 Data Flow

```
User Input
    ↓
Recipe Concept Agent → Strategy (chunking)
    ↓
For Each Chunk (5 recipes):
    ├─ Concept Agent → Generate 5 recipes
    ├─ Validator Agent → Validate macros
    ├─ Orchestrator Agent → Save to DB
    ├─ Monitor Agent → Update progress
    └─ Artist Agent → Queue images (async)
    ↓
Complete → Show results
```

## 🧪 Testing Strategy

1. **Unit Tests**: Each agent isolated
2. **Integration Tests**: Agent coordination
3. **E2E Tests**: Full 10/20/30 recipe flows
4. **Performance Tests**: Benchmark < 5s per recipe
5. **Stress Tests**: Concurrent generation

## 📚 Key Reference Files

**Existing:**
- `server/services/recipeGenerator.ts` - Current architecture
- `server/services/openai.ts` - OpenAI integration
- `client/src/components/RecipeGenerationModal.tsx` - Progress UI
- `test/unit/services/recipeGenerator.nonblocking.test.ts` - Test patterns

**Session Docs:**
- `BMAD_SESSION_OCTOBER_6_2025_RECIPE_GENERATION_FIX.md` - Previous fixes
- `RECIPE_GENERATION_FIX_SUMMARY.md` - Non-blocking summary

**BMAD Core:**
- `.bmad-core/index.ts` - BMAD patterns
- `.bmad-core/strategy/BusinessStrategyEngine.ts` - Strategy example

## 🔧 Environment Variables

```bash
OPENAI_API_KEY=<key>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_ENDPOINT=https://tor1.digitaloceanspaces.com
S3_BUCKET_NAME=pti
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fitmeal
ENABLE_WEBSOCKET_PROGRESS=true  # Optional
```

## 💡 Quick Start Commands

```bash
# Run existing tests
npm test

# Run recipe generator tests
npm test -- test/unit/services/recipeGenerator.nonblocking.test.ts

# Start dev server
npm run dev

# Access application
http://localhost:4000
```

## 🎯 Implementation Priority

1. **Phase 1** (CRITICAL) - Core agents & chunking
2. **Phase 4** (CRITICAL) - Testing infrastructure  
3. **Phase 2** (HIGH) - Progress visualization
4. **Phase 3** (HIGH) - Image uniqueness
5. **Phase 5** (HIGH) - API integration

---

**Ready to implement?** Copy the full prompt from `CLAUDE_CODE_MEAL_GENERATION_ENHANCEMENT_PROMPT.md` and paste it into Claude Code.
