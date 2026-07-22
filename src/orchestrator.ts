/**
 * Orchestrator
 * ------------
 * Main entry point. Coordinates the multi-agent pipeline:
 *
 * 1. Fetch task from Jira
 * 2. Reader Agent analyzes the task
 * 3. Debater Agents debate test coverage (up to MAX_DEBATE_ROUNDS)
 * 4. Reviewer Agent consolidates and approves test cases
 * 5. Test cases are pushed to Zephyr
 */

import Anthropic from "@anthropic-ai/sdk";
import { getTask, formatTaskForAgent } from "./integrations/jira";
import { createTestCases } from "./integrations/zephyr";
import { readerAgent } from "./agents/reader";
import { runDebateRound } from "./agents/debaters";
import { reviewerAgent } from "./agents/reviewer";
import { AgentContext } from "./types";

const MAX_DEBATE_ROUNDS = 2;

async function run(taskId: string): Promise<void> {
  console.log(`\n🚀 Starting test generation for task: ${taskId}\n`);
  console.log("=".repeat(60));

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Step 1: Fetch task from Jira
  console.log("\n📋 [Jira] Fetching task...");
  const task = getTask(taskId);
  const formattedTask = formatTaskForAgent(task);
  console.log(`✅ Task loaded: ${task.summary}`);

  // Initialize shared context
  const context: AgentContext = {
    task,
    formattedTask,
    debateHistory: [],
  };

  // Step 2: Reader Agent
  console.log("\n" + "=".repeat(60));
  const analysis = await readerAgent(client, context);
  context.debateHistory.push({
    agent: "Reader Agent",
    content: analysis,
  });

  // Step 3: Debate rounds (with loop guard)
  console.log("\n" + "=".repeat(60));
  for (let round = 1; round <= MAX_DEBATE_ROUNDS; round++) {
    await runDebateRound(client, context, round);
  }

  // Step 4: Reviewer Agent
  console.log("\n" + "=".repeat(60));
  const reviewResult = await reviewerAgent(client, context);

  if (!reviewResult.approved) {
    console.error("\n❌ Review failed:", reviewResult.feedback);
    process.exit(1);
  }

  console.log(`\n📝 Reviewer feedback: ${reviewResult.feedback}`);

  // Step 5: Push to Zephyr
  console.log("\n" + "=".repeat(60));
  console.log("\n📤 [Zephyr] Creating test cases...");
  const zephyrCases = createTestCases(taskId, reviewResult.testCases);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("\n✅ Pipeline completed successfully!");
  console.log(`   Task:        ${taskId} — ${task.summary}`);
  console.log(`   Test cases:  ${zephyrCases.length} created`);
  console.log(`   Debate rounds: ${MAX_DEBATE_ROUNDS}`);
  console.log(`   Agents: Reader → UI + Critical + EdgeCase → Reviewer\n`);
}

// Entry point
const taskId = process.argv[2] ?? "PROJ-142";
run(taskId).catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
