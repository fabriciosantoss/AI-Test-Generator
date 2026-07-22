/**
 * Reviewer Agent
 * --------------
 * Quality gate that consolidates the debate output into
 * structured, deduplicated, and prioritized test cases.
 *
 * Outputs valid JSON matching the TestCase interface,
 * ready to be sent to Zephyr.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AgentContext, ReviewResult, TestCase } from "../types";

const SYSTEM_PROMPT = `You are a Lead QA Engineer responsible for finalizing test cases.

Given a debate between specialized agents, your job is to:
1. Consolidate all proposed test cases
2. Remove duplicates and redundancies
3. Ensure full coverage of acceptance criteria
4. Prioritize test cases by risk and importance
5. Format everything as structured JSON

You MUST respond with valid JSON only. No markdown, no explanation — just the JSON object.

Output format:
{
  "approved": true,
  "feedback": "Brief summary of what was covered and any gaps",
  "testCases": [
    {
      "title": "string",
      "objective": "string",
      "preconditions": ["string"],
      "steps": ["string"],
      "expectedResult": "string",
      "type": "functional" | "edge_case" | "negative" | "ui" | "security",
      "priority": "high" | "medium" | "low"
    }
  ]
}`;

export async function reviewerAgent(
  client: Anthropic,
  context: AgentContext
): Promise<ReviewResult> {
  console.log("\n🔍 [Reviewer Agent] Consolidating test cases...");

  const debateSummary = context.debateHistory
    .map((msg) => `[${msg.agent}]:\n${msg.content}`)
    .join("\n\n---\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Original Task:\n\n${context.formattedTask}\n\n---\n\nAgent Debate:\n\n${debateSummary}\n\n---\n\nConsolidate all test cases into the required JSON format.`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    const result: ReviewResult = JSON.parse(raw);
    console.log(
      `✅ [Reviewer Agent] ${result.testCases.length} test cases approved.`
    );
    return result;
  } catch {
    console.error("❌ [Reviewer Agent] Failed to parse JSON response.");
    console.error("Raw response:", raw);
    throw new Error("Reviewer agent returned invalid JSON");
  }
}
