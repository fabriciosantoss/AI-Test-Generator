/**
 * Debater Agents
 * --------------
 * Three agents with distinct personas debate test coverage:
 *
 * - UI Agent: Focuses on user experience, interface flows, and visual feedback
 * - Critical Agent: Focuses on security, data integrity, and critical business rules
 * - Edge Case Agent: Focuses on boundary conditions, unexpected inputs, and failure scenarios
 *
 * Each agent receives the full debate history to build on previous insights.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AgentContext, DebateMessage } from "../types";

const AGENT_PERSONAS = {
  ui: {
    name: "UI Agent",
    emoji: "🎨",
    system: `You are a QA Engineer specialized in UI/UX testing.
Your focus is on:
- User interface flows and navigation
- Visual feedback and error messages
- Form validations and input handling
- Responsive behavior and accessibility
- User experience consistency

Review the task analysis and debate history, then propose test cases from a UI perspective.
Be specific about what the user sees and interacts with.`,
  },
  critical: {
    name: "Critical Agent",
    emoji: "🔒",
    system: `You are a QA Engineer specialized in critical path and security testing.
Your focus is on:
- Security vulnerabilities and authentication flows
- Data integrity and persistence
- Business rule enforcement
- Performance under load
- Session management and authorization

Review the task analysis and debate history, then propose test cases for critical scenarios.
Emphasize what could go wrong from a security and data perspective.`,
  },
  edgeCase: {
    name: "Edge Case Agent",
    emoji: "⚠️",
    system: `You are a QA Engineer specialized in edge cases and negative testing.
Your focus is on:
- Boundary value analysis
- Invalid and unexpected inputs
- Race conditions and concurrency
- System limits and constraints
- Error handling and recovery flows

Review the task analysis and debate history, then propose test cases for edge cases.
Think about what developers typically forget to handle.`,
  },
};

type AgentKey = keyof typeof AGENT_PERSONAS;

async function runDebaterAgent(
  client: Anthropic,
  agentKey: AgentKey,
  context: AgentContext,
  round: number
): Promise<DebateMessage> {
  const persona = AGENT_PERSONAS[agentKey];
  console.log(`  ${persona.emoji} [${persona.name}] Round ${round} thinking...`);

  const debateContext = context.debateHistory
    .map((msg) => `[${msg.agent}]: ${msg.content}`)
    .join("\n\n---\n\n");

  const userMessage =
    context.debateHistory.length === 0
      ? `Task Analysis:\n\n${context.debateHistory[0]?.content ?? context.formattedTask}\n\nPropose your initial test cases.`
      : `Task Analysis:\n\n${context.formattedTask}\n\nDebate so far:\n\n${debateContext}\n\nRound ${round}: Review what others said and add new perspectives, fill gaps, or challenge assumptions. Avoid repeating already-covered scenarios.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: persona.system,
    messages: [{ role: "user", content: userMessage }],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  return { agent: persona.name, content };
}

export async function runDebateRound(
  client: Anthropic,
  context: AgentContext,
  round: number
): Promise<DebateMessage[]> {
  console.log(`\n🗣️  [Debate] Round ${round} starting...`);

  const messages: DebateMessage[] = [];

  for (const agentKey of ["ui", "critical", "edgeCase"] as AgentKey[]) {
    const message = await runDebaterAgent(client, agentKey, context, round);
    messages.push(message);
    context.debateHistory.push(message);
  }

  return messages;
}
