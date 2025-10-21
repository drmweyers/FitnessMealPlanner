# 🎯 Claude API Integration for Autonomous Bug Fixer

**Date**: October 11, 2025
**Status**: ✅ 80% Complete - Config done, AI methods need update

---

## ✅ What's Been Completed

### 1. Anthropic SDK Installed ✅
```bash
npm install @anthropic-ai/sdk
# Added @anthropic-ai/sdk@^0.65.0 to dependencies
```

### 2. Configuration Updated ✅
**File**: `test/autonomous-fix/config/fix-config.ts`

**Changes Made**:
- ✅ Added `aiProvider: 'anthropic' | 'openai'` (defaults to 'anthropic')
- ✅ Added `anthropicApiKey` configuration
- ✅ Added `anthropicModel: 'claude-3-5-sonnet-20241022'` (best for code)
- ✅ Updated `getFixConfig()` to support both providers
- ✅ Updated `validateConfig()` to check appropriate API key
- ✅ Backward compatible with OpenAI

### 3. Types Updated ✅
**File**: `test/autonomous-fix/types/index.ts`

**Changes Made**:
- ✅ Updated `FixConfig` interface with AI provider fields
- ✅ Added comments for clarity
- ✅ Maintains backward compatibility

---

## ⚠️ What Needs to Be Done (20%)

### Main Task: Update AutonomousBugFixerAI to Support Claude

**File to Update**: `test/autonomous-fix/core/AutonomousBugFixerAI.ts`

The file currently uses OpenAI exclusively. We need to:

1. **Import Anthropic SDK**:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
```

2. **Update Constructor**:
```typescript
export class AutonomousBugFixerAI {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private config: FixConfig;

  constructor(
    config: FixConfig,
    private codebase: CodebaseManager,
    private git: GitManager,
    private testRunner: TestRunner
  ) {
    this.config = config;

    if (config.aiProvider === 'anthropic') {
      this.anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
    } else {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }
}
```

3. **Update Each AI Method** to support both providers:
   - `classifyIssue()`
   - `analyzeRootCause()`
   - `generateFix()`

Example for `classifyIssue()`:
```typescript
async classifyIssue(issue: DetectedIssue): Promise<IssueClassification> {
  const prompt = `...`; // Same prompt works for both

  try {
    if (this.config.aiProvider === 'anthropic') {
      // Use Claude
      const response = await this.anthropic!.messages.create({
        model: this.config.anthropicModel,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }],
        system: 'You are an expert bug classifier...'
      });

      const result = JSON.parse(response.content[0].text);
      return result as IssueClassification;
    } else {
      // Use OpenAI (existing code)
      const response = await this.openai!.chat.completions.create({
        model: this.config.openaiModel,
        messages: [
          { role: 'system', content: 'You are an expert bug classifier...' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content!) as IssueClassification;
    }
  } catch (error) {
    // Error handling...
  }
}
```

4. **Update AutonomousBugFixer Constructor**:
```typescript
// In test/autonomous-fix/core/AutonomousBugFixer.ts
constructor(projectRoot?: string) {
  const root = projectRoot || process.cwd();

  this.config = getFixConfig();

  // Validate config
  const validation = validateConfig(this.config);
  if (!validation.valid) {
    throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
  }

  this.codebase = new CodebaseManager(root);
  this.git = new GitManager(root);
  this.testRunner = new TestRunner(root);

  // Pass config instead of creating OpenAI client
  this.ai = new AutonomousBugFixerAI(
    this.config,
    this.codebase,
    this.git,
    this.testRunner
  );
}
```

---

## 🚀 How to Use with Claude (After Completion)

### Option 1: Use Your Claude Code API Key

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-your-key-here"

# The system will automatically use Claude
npm run fix:auto
```

### Option 2: Get API Key from Claude Dashboard

1. Go to: https://console.anthropic.com/
2. Create API key
3. Export it:
```bash
export ANTHROPIC_API_KEY="sk-ant-api-key"
```

### Option 3: Switch Between Providers

```bash
# Use Claude (default)
export AI_PROVIDER="anthropic"
export ANTHROPIC_API_KEY="sk-ant-..."

# Or use OpenAI
export AI_PROVIDER="openai"
export OPENAI_API_KEY="sk-..."
```

---

## 📊 Why Claude is Better for This

### Claude 3.5 Sonnet Advantages:
1. **Better Code Understanding**: Superior at reading and understanding complex codebases
2. **Longer Context**: 200K tokens vs GPT-4's 128K
3. **More Precise**: Better at following exact instructions for code generation
4. **JSON Mode**: Native support for structured outputs
5. **Cost**: More cost-effective for code analysis tasks
6. **You Already Have Access**: Using Claude Code right now!

---

## ⏱️ Time to Complete

**Estimated Time**: 30-45 minutes

**Tasks**:
1. Update `AutonomousBugFixerAI.ts` constructor (5 min)
2. Update `classifyIssue()` method (10 min)
3. Update `analyzeRootCause()` method (10 min)
4. Update `generateFix()` method (10 min)
5. Test with sample failing test (5 min)

---

## 🎯 Quick Implementation Script

Would you like me to complete the AI method updates now? I can:

**Option A**: Update all 3 AI methods to support both Claude and OpenAI (~30 min)

**Option B**: Update to Claude ONLY (simpler, faster ~15 min)

**Option C**: Create a helper function that abstracts the provider (~20 min, cleanest)

---

## 💡 Testing Plan

Once implementation is complete:

```bash
# 1. Set API key
export ANTHROPIC_API_KEY="your-key"

# 2. Run on a single failing test first
npx playwright test test/e2e/simple-test.spec.ts

# 3. If test fails, run fixer
npm run fix:detect  # Detect only first

# 4. Then run full fix
npm run fix:auto

# 5. Check results
cat test-results/autonomous-fixes/fix-report-*.json
```

---

## 📋 Files Modified So Far

1. ✅ `package.json` - Added @anthropic-ai/sdk
2. ✅ `test/autonomous-fix/config/fix-config.ts` - Updated config
3. ✅ `test/autonomous-fix/types/index.ts` - Updated types
4. ⚠️ `test/autonomous-fix/core/AutonomousBugFixerAI.ts` - NEEDS UPDATE
5. ⚠️ `test/autonomous-fix/core/AutonomousBugFixer.ts` - Minor constructor update needed

---

## 🎉 Summary

**What We've Accomplished:**
- ✅ Anthropic SDK installed
- ✅ Configuration system supports both providers
- ✅ Types updated
- ✅ System defaults to Claude
- ✅ Backward compatible with OpenAI

**What's Left:**
- ⚠️ Update 3 AI methods in AutonomousBugFixerAI
- ⚠️ Update constructor in AutonomousBugFixer
- ⚠️ Test with real failing test

**Estimated Completion**: 80% done, 20% remaining

---

## 🤝 Next Steps

**Ready to complete the integration?**

Let me know and I'll update the AI methods to support Claude. The changes are straightforward - just need to add the Anthropic API calls alongside the existing OpenAI ones.

**Once complete, you'll be able to:**
✅ Use your Claude Code API key (no need for OpenAI)
✅ Run autonomous bug fixes powered by Claude 3.5 Sonnet
✅ Fix meal plan generator tests automatically
✅ Get better code understanding and fixes

---

**Document Created**: October 11, 2025
**Status**: Configuration Complete, AI Methods Pending
**Next**: Update AutonomousBugFixerAI class
