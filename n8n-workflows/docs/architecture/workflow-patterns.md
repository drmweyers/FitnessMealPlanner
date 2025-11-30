# n8n Workflow Patterns

**Version:** 1.0
**Last Updated:** [Date]

---

## Pattern Selection Guide

| Pattern | Use When | Complexity | Common Services |
|---------|----------|------------|-----------------|
| **Webhook Processing** | External service triggers workflow | Low-Medium | HTTP, Slack, Telegram |
| **Scheduled Data Sync** | Periodic synchronization needed | Medium | APIs, Databases, Sheets |
| **AI Agent Workflow** | Multi-step AI reasoning with tools | High | OpenAI, Claude, Vector Store |
| **HTTP API Integration** | REST API calls and transformations | Low-Medium | HTTP Request, Code |
| **Event-Driven Automation** | React to external events | Medium | Webhooks, Queue systems |
| **Data Pipeline** | ETL (Extract, Transform, Load) | Medium-High | Databases, APIs, Storage |

---

## Pattern 1: Webhook Processing

### When to Use
- External service needs to trigger n8n workflows
- Real-time event processing required
- Third-party webhooks (GitHub, Stripe, etc.)

### Structure
```
Webhook Trigger
  ↓
Validate Signature (optional but recommended)
  ↓
Parse & Validate Data
  ↓
Main Processing Logic
  ↓ (on error)
Error Handler → Log + Notify
  ↓
Return Response
```

### Example Implementation

**Nodes:**
1. **Webhook** - Receive POST request
2. **Code - Validate Signature** - Security check
3. **IF - Check Required Fields** - Data validation
4. **[Processing Nodes]** - Business logic
5. **Respond to Webhook** - Return success/error

**Code Example (Signature Validation):**
```javascript
// Validate webhook signature (example: GitHub)
const crypto = require('crypto');

const signature = $headerParameterValues['x-hub-signature-256'];
const secret = $env.WEBHOOK_SECRET;
const payload = JSON.stringify($json);

const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid signature');
}

return { json: $json };
```

### Best Practices
- ✅ Always validate webhook signatures
- ✅ Return response quickly (< 3 seconds)
- ✅ Use async processing for long-running tasks
- ✅ Implement idempotency for duplicate webhooks
- ✅ Log all webhook receipts for debugging

---

## Pattern 2: Scheduled Data Sync

### When to Use
- Periodic data synchronization (hourly, daily, weekly)
- Batch processing of records
- Regular report generation

### Structure
```
Schedule Trigger (Cron)
  ↓
Fetch Data from Source
  ↓
Transform Data
  ↓
Update Destination
  ↓ (on error)
Error Handler → Retry + Notify
  ↓
Log Success
```

### Example Implementation

**Nodes:**
1. **Schedule Trigger** - Cron expression
2. **HTTP Request - Fetch Data** - Get from API/Database
3. **Code - Transform** - Clean and format data
4. **[Destination Node]** - Write to database/sheets
5. **Slack - Notify Success** - Confirmation message

**Cron Examples:**
```
0 0 * * * - Daily at midnight
0 */6 * * * - Every 6 hours
0 9 * * 1 - Every Monday at 9 AM
0 0 1 * * - First day of each month
```

### Best Practices
- ✅ Use incremental sync (track last sync timestamp)
- ✅ Handle large datasets with pagination
- ✅ Implement checkpointing for resumability
- ✅ Add execution timeout appropriate for data volume
- ✅ Monitor sync failures and retry logic

---

## Pattern 3: AI Agent Workflow

### When to Use
- Multi-step AI reasoning required
- AI needs to use tools/APIs
- Dynamic decision-making based on context

### Structure
```
Trigger (Webhook/Manual)
  ↓
Initialize AI Agent
  ↓
Agent Reasoning Loop
  ├─ Tool 1 Execution
  ├─ Tool 2 Execution
  └─ Tool N Execution
  ↓
Generate Final Response
  ↓
Return/Store Result
```

### Example Implementation

**Nodes:**
1. **Webhook/Manual Trigger** - Start workflow
2. **AI Agent** - Configure with system prompt and tools
3. **[Tool Nodes]** - Functions the AI can call
4. **Code - Format Response** - Structure output
5. **Respond to Webhook** - Return AI response

**AI Agent Configuration:**
```javascript
// System prompt example
const systemPrompt = `You are a helpful assistant that can:
1. Search our knowledge base
2. Fetch user data from database
3. Send notifications

Use these tools to help users with their requests.`;

// Tool definitions (n8n AI Agent format)
const tools = [
  {
    name: 'search_knowledge_base',
    description: 'Search internal documentation',
    parameters: {
      query: 'string'
    }
  },
  {
    name: 'get_user_data',
    description: 'Fetch user information by ID',
    parameters: {
      userId: 'string'
    }
  }
];
```

### Best Practices
- ✅ Write clear, specific system prompts
- ✅ Define tools with precise descriptions
- ✅ Set reasonable token limits
- ✅ Implement fallback for AI failures
- ✅ Log AI decisions for debugging

---

## Pattern 4: HTTP API Integration

### When to Use
- REST API calls needed
- Data fetching from external services
- Integration with custom backends

### Structure
```
Trigger
  ↓
Prepare Request Parameters
  ↓
HTTP Request (with retry)
  ↓
Validate Response
  ↓
Transform Response Data
  ↓
Output/Store Result
```

### Example Implementation

**Nodes:**
1. **Trigger** - Any trigger type
2. **Code - Prepare Parameters** - Build query params
3. **HTTP Request** - Configure with retry logic
4. **IF - Check Status Code** - Validate response
5. **Code - Transform Data** - Format response
6. **[Output Node]** - Use the data

**HTTP Request Configuration:**
```javascript
// Request settings
{
  method: 'GET',
  url: '{{ $env.API_BASE_URL }}/users/{{ $json.userId }}',
  headers: {
    'Authorization': 'Bearer {{ $credentials.api.token }}',
    'Content-Type': 'application/json'
  },
  timeout: 30000,
  retry: {
    maxRetries: 3,
    waitBetween: 1000
  }
}
```

### Error Handling
```javascript
// Handle different error types
const statusCode = $json.statusCode;

if (statusCode === 429) {
  // Rate limit - wait and retry
  return { json: { action: 'retry', waitMs: 60000 } };
} else if (statusCode >= 500) {
  // Server error - retry with backoff
  return { json: { action: 'retry', waitMs: 5000 } };
} else if (statusCode === 404) {
  // Not found - don't retry
  return { json: { action: 'skip', reason: 'Resource not found' } };
} else if (statusCode >= 400) {
  // Client error - log and fail
  throw new Error(`API error: ${$json.error}`);
}
```

### Best Practices
- ✅ Always set timeouts (default: 30s)
- ✅ Implement retry logic for transient errors
- ✅ Use environment variables for base URLs
- ✅ Handle rate limiting gracefully
- ✅ Validate response structure before using data

---

## Pattern 5: Event-Driven Automation

### When to Use
- React to events from multiple sources
- Fan-out/fan-in processing
- Event orchestration across services

### Structure
```
Event Source (Webhook/Queue)
  ↓
Event Router (Switch)
  ├─ Event Type A → Handler A
  ├─ Event Type B → Handler B
  └─ Event Type C → Handler C
  ↓
Aggregate Results (optional)
  ↓
Publish Event (optional)
```

### Example Implementation

**Nodes:**
1. **Webhook** - Receive events
2. **Switch - Route by Event Type** - Conditional routing
3. **[Handler Nodes]** - Process each event type
4. **Merge** - Combine results (if needed)
5. **HTTP Request - Publish Event** - Notify downstream

**Event Routing:**
```javascript
// Route based on event type
const eventType = $json.event;

switch(eventType) {
  case 'user.created':
    return 0; // Route to output 0
  case 'user.updated':
    return 1; // Route to output 1
  case 'user.deleted':
    return 2; // Route to output 2
  default:
    return 3; // Route to error handler
}
```

### Best Practices
- ✅ Use consistent event schema
- ✅ Include event metadata (timestamp, source, ID)
- ✅ Implement dead-letter queue for failed events
- ✅ Add event versioning for schema evolution
- ✅ Monitor event processing latency

---

## Pattern 6: Data Pipeline (ETL)

### When to Use
- Extract data from multiple sources
- Complex data transformations needed
- Load into data warehouse or analytics platform

### Structure
```
Trigger (Schedule/Manual)
  ↓
Extract from Source 1
  ↓
Extract from Source 2
  ↓
Merge Data
  ↓
Transform (Clean, Enrich, Aggregate)
  ↓
Load to Destination
  ↓
Log Pipeline Execution
```

### Example Implementation

**Nodes:**
1. **Schedule Trigger** - Daily at 2 AM
2. **HTTP Request - Fetch Users** - Source 1
3. **Google Sheets - Fetch Orders** - Source 2
4. **Merge** - Combine datasets
5. **Code - Transform** - ETL logic
6. **PostgreSQL - Insert** - Load to warehouse
7. **Slack - Notify** - Pipeline completion

**ETL Transform Example:**
```javascript
// Extract
const users = $items('HTTP Request - Fetch Users');
const orders = $items('Google Sheets - Fetch Orders');

// Transform
const enrichedOrders = orders.map(order => {
  const user = users.find(u => u.json.id === order.json.userId);

  return {
    orderId: order.json.id,
    orderTotal: order.json.total,
    userId: order.json.userId,
    userName: user ? user.json.name : 'Unknown',
    userEmail: user ? user.json.email : null,
    processedAt: new Date().toISOString()
  };
});

// Load (prepare for database insert)
return enrichedOrders.map(data => ({ json: data }));
```

### Best Practices
- ✅ Handle missing or incomplete data gracefully
- ✅ Use batch inserts for performance
- ✅ Implement data quality checks
- ✅ Track pipeline execution metadata
- ✅ Add data lineage information

---

## Pattern 7: Error Handling & Retry

### Universal Error Handling Pattern

```
Main Processing Node
  ↓ (on success)
Success Path
  ↓ (on error)
Error Trigger
  ↓
IF - Categorize Error
  ├─ Transient (network, timeout) → Retry with Backoff
  ├─ Rate Limit → Wait and Retry
  ├─ Validation Error → Log and Skip
  └─ Fatal Error → Log and Alert
```

### Retry Logic Implementation
```javascript
// Exponential backoff retry
const maxRetries = 3;
const baseDelay = 1000; // 1 second

for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    const result = await performOperation();
    return { json: { success: true, data: result } };
  } catch (error) {
    if (attempt === maxRetries - 1) {
      // Final attempt failed
      throw error;
    }

    // Calculate backoff delay: 1s, 2s, 4s
    const delay = baseDelay * Math.pow(2, attempt);
    console.log(`Retry ${attempt + 1} after ${delay}ms`);

    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

---

## Pattern Selection Matrix

### By Complexity

| Complexity | Patterns | Typical Use Cases |
|------------|----------|-------------------|
| **Low** | Webhook Processing, HTTP API | Simple integrations, notifications |
| **Medium** | Scheduled Sync, Event-Driven | Data sync, multi-service orchestration |
| **High** | AI Agent, Data Pipeline | AI workflows, complex ETL |

### By Trigger Type

| Trigger | Best Patterns | Examples |
|---------|--------------|----------|
| **Webhook** | Webhook Processing, Event-Driven | GitHub events, Stripe payments |
| **Schedule** | Scheduled Sync, Data Pipeline | Daily reports, hourly sync |
| **Manual** | HTTP API, AI Agent | Ad-hoc requests, testing |

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| [Date] | 1.0 | Initial workflow patterns |
