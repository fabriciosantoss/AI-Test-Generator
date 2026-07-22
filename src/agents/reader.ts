/**
 * Reader Agent
 * ------------
 * Reads the Jira task and extracts structured information:
 * requirements, acceptance criteria, technical constraints,
 * and potential risk areas to guide the debate agents.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AgentContext } from "../types";

const SYSTEM_PROMPT = `You are a Senior QA Analyst specialized in reading and interpreting software requirements.
Your job is to analyze a Jira task and extract:
1. Core functionalities to be tested
2. Explicit acceptance criteria
3. Technical constraints and edge cases implied by the description
4. Risk areas that require special attention

Be thorough but concise. Structure your output clearly so other agents can build on it.`;

export async function readerAgent(
  client: Anthropic,
  context: AgentContext
): Promise<string> {
  console.log("📖 [Reader Agent] Analyzing task...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze the following Jira task and extract all relevant information for test case generation:\n\n${context.formattedTask}`,
      },
    ],
  });

  const analysis =
    response.content[0].type === "text" ? response.content[0].text : "";

  console.log("📖 [Reader Agent] Analysis complete.");
  return analysis;
}
