---
name: interaction-surface-mapping
description: Exhaustively inventory every route, API, component, state, side effect, and tier boundary in a web app so QA can target 100% coverage. Use when starting a warfare QA cycle or auditing coverage. Trigger phrases - "map the surface", "inventory interactions", "RECON", "what can users do".
---

# Interaction Surface Mapping

## Purpose

You cannot test what you have not enumerated. This skill produces the **coverage matrix scaffold** — a complete, role-indexed inventory of everything a user can do. Every later QA skill consumes it.

## The 8 Inventory Dimensions

For each dimension, produce a row-per-item table. Never summarize — list them.

### 1. Routes (`client/src/pages/`, `Router.tsx`)

| Path | Component | Role guard | Purpose | Auth required |

### 2. API Endpoints (`server/routes/`, `server/controllers/`)

| Method | Path | Role required | Request schema | Response shape | Side effects |

- Grep `router.(get|post|put|patch|delete)` recursively.
- For each: note the controller, auth middleware, validation schema.
- Side effects to flag: `sendEmail`, `s3.upload`, `sse.send`, `fetch(hal`, `openai`, `stripe`, cascade deletes.

### 3. Interactive Components

| File | Element | Event | Endpoint called | Role |

- Grep `onClick=`, `onSubmit=`, `onChange=` in pages + components.
- Every `<Dialog>`, `<Modal>`, `<Sheet>`, `<Drawer>`, `<Popover>`.
- Every `<Select>`, `<Combobox>`, filter input.

### 4. State Machines (`server/db/schema.ts`)

| Resource | States (enum) | Legal transitions | Trigger (role + action) | Invalid transitions |

- Grep `pgEnum`, `enum(`, `status:`, `type: 'enum'`.
- Draw the FSM for each. Explicitly list transitions the app must REJECT.

### 5. Cross-Role Touchpoints

| Actor | Action | Affected actor | Expected visible change | Propagation (sync/SSE/poll) | Latency budget |

- A touchpoint exists whenever mutation by role X changes what role Y sees.

### 6. Side Effects

| Trigger | Effect | Verification point | Failure mode |

- Email queue, S3 upload, SSE stream, webhook call, GitHub issue, Hal post, PDF generation, cache invalidation, log emission.

### 7. Tier-Gated Features

| Feature | Starter | Pro | Enterprise | Enforcement point (middleware/controller) |

- Grep for tier checks, plan checks, feature flags, usage counters.

### 8. Forms & Validation

| Form | Fields | Schema | Submit endpoint | Client-side rules | Server-side rules |

## The Coverage Matrix Scaffold

After the 8 inventories, generate a CSV at `docs/plans/coverage-matrix.csv`:

```
cell_id,role,endpoint,state,input_class,assertion_type,status,test_file
001,anon,POST /api/auth/login,N/A,valid,200+token,pending,
002,anon,POST /api/auth/login,N/A,malformed,400,pending,
003,anon,POST /api/auth/login,N/A,malicious_sqli,400,pending,
...
```

Where:

- `role` ∈ {anon, customer, trainer, admin, attacker}
- `input_class` ∈ {valid, boundary, malformed, malicious, missing}
- `assertion_type` ∈ {db_state, ui_render, side_effect, security_boundary, perf, regression}
- `status` ∈ {pending, tested, n/a, known_gap}

**Target:** zero `pending` rows at end of warfare cycle.

## Output Files

1. `docs/plans/qa-warfare-recon-surface.md` — human-readable inventory
2. `docs/plans/coverage-matrix.csv` — machine-readable cell list
3. `docs/plans/state-machines.md` — one FSM diagram per resource (mermaid)

## Rules

- Never skip a file because it "looks internal" — middleware and background workers are interactions too.
- Every grep query is recorded in the output doc so the scan is reproducible.
- Every "TODO / planned" feature is listed as `known_gap` so coverage isn't falsely green.

## Done when

- Every route in the repo is in the table
- Every enum in the schema has an FSM diagram
- The coverage matrix has ≥ 1 cell per role × endpoint × input-class combination
