import { AgentContext, JiraTask, TestCase, ReviewResult } from "../types";

export const mockTask: JiraTask = {
  id: "PROJ-142",
  summary: "Implement password reset flow via email",
  description:
    "Users must be able to reset their password through a secure email-based flow.\n\nAcceptance Criteria:\n- User enters registered email\n- System sends a reset link valid for 30 minutes\n- Link can only be used once\n- After reset, all active sessions are invalidated\n\nTechnical Notes:\n- Rate limit: max 3 reset requests per hour per email\n- Token must be stored hashed",
  type: "Story",
  priority: "High",
  labels: ["authentication", "security", "email"],
};

export const mockFormattedTask = `
TASK ID: PROJ-142
SUMMARY: Implement password reset flow via email
TYPE: Story
PRIORITY: High
LABELS: authentication, security, email

DESCRIPTION:
Users must be able to reset their password through a secure email-based flow.
`.trim();

export const mockTestCase: TestCase = {
  title: "Valid password reset with registered email",
  objective: "Ensure reset email is sent when a valid email is provided",
  preconditions: ["User has an active account", "User is on the forgot password screen"],
  steps: ["Enter a valid registered email", "Click Send reset link"],
  expectedResult: "Success message is shown and email is sent within 1 minute",
  type: "functional",
  priority: "high",
};

export const mockReviewResult: ReviewResult = {
  approved: true,
  feedback: "All acceptance criteria covered across functional, security, and edge case scenarios.",
  testCases: [mockTestCase],
};

export const mockAgentContext: AgentContext = {
  task: mockTask,
  formattedTask: mockFormattedTask,
  debateHistory: [],
};
