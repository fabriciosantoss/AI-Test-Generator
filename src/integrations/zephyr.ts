/**
 * Zephyr Integration (Mock)
 * -------------------------
 * Simulates Zephyr Scale API for test case creation.
 * In production, replace with actual Zephyr REST API calls:
 * POST /v2/testcases
 */

import fs from "fs";
import path from "path";
import { TestCase } from "../types";

const OUTPUT_DIR = path.resolve(__dirname, "../../output");

export interface ZephyrTestCase {
  id: string;
  key: string;
  name: string;
  objective: string;
  precondition: string;
  testScript: {
    steps: Array<{ description: string; expectedResult: string }>;
  };
  priority: string;
  labels: string[];
  status: string;
}

export function createTestCases(
  taskId: string,
  testCases: TestCase[]
): ZephyrTestCase[] {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const zephyrCases: ZephyrTestCase[] = testCases.map((tc, index) => ({
    id: `mock-${Date.now()}-${index}`,
    key: `${taskId}-TC-${String(index + 1).padStart(3, "0")}`,
    name: tc.title,
    objective: tc.objective,
    precondition: tc.preconditions.join("\n"),
    testScript: {
      steps: tc.steps.map((step, i) => ({
        description: step,
        expectedResult:
          i === tc.steps.length - 1 ? tc.expectedResult : "Step completed successfully",
      })),
    },
    priority: tc.priority,
    labels: [tc.type],
    status: "Draft",
  }));

  // Save output locally (mock of Zephyr API response)
  const outputFile = path.join(OUTPUT_DIR, `${taskId}_test_cases.json`);
  fs.writeFileSync(outputFile, JSON.stringify(zephyrCases, null, 2));

  console.log(`\n✅ ${zephyrCases.length} test cases saved to ${outputFile}`);
  return zephyrCases;
}
