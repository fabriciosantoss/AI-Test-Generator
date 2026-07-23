# Multi-Agent Test Case Generator

An AI-powered system that automatically generates test cases from Jira tasks using a multi-agent architecture with Claude (Anthropic).

---

## Architecture

```
Jira Task
    │
    ▼
┌─────────────┐
│ Reader Agent │  → Extracts requirements, AC, risks, and constraints
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│               Debate Round(s)             │
│                                          │
│  🎨 UI Agent       → UX flows, forms,   │
│                       visual feedback    │
│                                          │
│  🔒 Critical Agent → Security, sessions,│
│                       business rules     │
│                                          │
│  ⚠️  Edge Case Agent→ Boundaries, invalid│
│                       inputs, failures   │
└──────┬───────────────────────────────────┘
       │  (shared debate history, up to MAX_DEBATE_ROUNDS)
       ▼
┌──────────────┐
│ Reviewer Agent│  → Consolidates, deduplicates, outputs JSON
└──────┬───────┘
       │
       ├──────────────────────────┐
       ▼                          ▼
  Zephyr API              ┌──────────────┐
  (test cases created)    │ Gherkin Agent │ → .feature files grouped by type
                          └──────────────┘
                            output/{taskId}/features/
                              ├── functional.feature
                              ├── security.feature
                              ├── edge_case.feature
                              └── negative.feature
```

### Key Design Decisions

- **No orchestration framework** — direct Anthropic SDK calls for full control and transparency
- **Shared debate context** — all agents receive the full `debateHistory` so each one builds on previous insights
- **Loop guard** — `MAX_DEBATE_ROUNDS` prevents infinite loops (configurable in `orchestrator.ts`)
- **Structured output** — Reviewer Agent outputs strict JSON, making Zephyr integration reliable
- **Mock integrations** — Jira and Zephyr are mocked locally so the project runs without external accounts

---

## Project Structure

```
multi-agent-test-generator/
├── src/
│   ├── agents/
│   │   ├── reader.ts       # Reads and analyzes the Jira task
│   │   ├── debaters.ts     # UI, Critical, and Edge Case agents
│   │   ├── reviewer.ts     # Consolidates debate into structured test cases
│   │   └── gherkin.ts      # Converts test cases into .feature files
│   ├── integrations/
│   │   ├── jira.ts         # Jira mock (swap for real API in production)
│   │   └── zephyr.ts       # Zephyr mock (swap for real API in production)
│   ├── tests/
│   │   ├── fixtures.ts     # Shared test data
│   │   ├── jira.test.ts
│   │   ├── zephyr.test.ts
│   │   ├── reader.test.ts
│   │   ├── debaters.test.ts
│   │   ├── reviewer.test.ts
│   │   └── gherkin.test.ts
│   ├── types.ts            # Shared TypeScript interfaces
│   └── orchestrator.ts     # Main pipeline entry point
├── samples/
│   └── task_example.json   # Sample Jira task for demo
├── output/                 # Generated files (gitignored)
│   └── {taskId}/
│       ├── {taskId}_test_cases.json
│       └── features/
│           ├── functional.feature
│           ├── security.feature
│           ├── edge_case.feature
│           └── negative.feature
├── .env.example
├── jest.config.ts
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

### Installation

```bash
git clone https://github.com//fabriciosantoss/AI-Test-Generator
cd multi-agent-test-generator
npm install
```

### Configuration

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

### Running

```bash
# Run with the default sample task (PROJ-142)
npm run dev

# Run with a specific task ID
npx ts-node src/orchestrator.ts PROJ-999
```

The generated test cases will be saved to `output/{taskId}_test_cases.json`.

---

## Example Output

**`output/PROJ-142/features/functional.feature`**
```gherkin
Feature: Password Reset Flow — Functional Scenarios

  Background:
    Given the user has an active account
    And the user is on the forgot password screen

  @functional @high
  Scenario: Valid password reset with registered email
    When the user enters a valid registered email address
    And clicks "Send reset link"
    Then a success message is displayed
    And a reset email is delivered within 1 minute

  @functional @medium
  Scenario: Reset link expires after 30 minutes
    Given the user requested a password reset
    When 31 minutes have passed
    And the user clicks the reset link
    Then an expiration error message is displayed
```

**`output/PROJ-142/PROJ-142_test_cases.json`**
```json
[
  {
    "key": "PROJ-142-TC-001",
    "name": "Valid password reset request with registered email",
    "objective": "Ensure the system sends a reset email when a valid registered email is submitted",
    "precondition": "User has an active account\nUser is on the forgot password screen",
    "testScript": {
      "steps": [
        { "description": "Enter a valid registered email address", "expectedResult": "Step completed successfully" },
        { "description": "Click 'Send reset link'", "expectedResult": "Success message is displayed and reset email is sent" }
      ]
    },
    "priority": "high",
    "labels": ["functional"],
    "status": "Draft"
  }
]
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
```

### Test Coverage

| File | What's tested |
|---|---|
| `integrations/jira.ts` | `getTask()` — file not found, id override, field mapping; `formatTaskForAgent()` — label join, full output |
| `integrations/zephyr.ts` | Key format, field mapping, step expectedResult logic, directory creation, file write |
| `agents/reader.ts` | API call, model used, formatted task in prompt, non-text response handling |
| `agents/debaters.ts` | 3 messages per round, agent names, history accumulation, multi-round growth |
| `agents/reviewer.ts` | JSON parse, field presence, invalid JSON throws, debate history in prompt, approved:false |
| `agents/gherkin.ts` | One file per type, filename format, directory creation, file write, Claude call count, empty input |

All external dependencies (`@anthropic-ai/sdk`, `fs`) are mocked — no API calls or disk writes happen during tests.

---

## Swapping Mocks for Real APIs

### Jira
Replace `src/integrations/jira.ts` → `getTask()` with:
```
GET https://{your-domain}.atlassian.net/rest/api/3/issue/{taskId}
Authorization: Bearer {JIRA_API_TOKEN}
```

### Zephyr Scale
Replace `src/integrations/zephyr.ts` → `createTestCases()` with:
```
POST https://api.zephyrscale.smartbear.com/v2/testcases
Authorization: Bearer {ZEPHYR_API_TOKEN}
```

---

## Configuration

| Variable | Location | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | `.env` | — | Required. Your Anthropic API key |
| `MAX_DEBATE_ROUNDS` | `orchestrator.ts` | `2` | Max debate iterations before review |

---

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/)
- [Anthropic SDK](https://github.com/anthropic-ai/anthropic-sdk) (`@anthropic-ai/sdk`)
- Claude Sonnet 4.6
