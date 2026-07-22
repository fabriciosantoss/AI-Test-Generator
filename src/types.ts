export interface JiraTask {
  id: string;
  summary: string;
  description: string;
  type: string;
  priority: string;
  labels: string[];
}

export interface TestCase {
  title: string;
  objective: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  type: "functional" | "edge_case" | "negative" | "ui" | "security";
  priority: "high" | "medium" | "low";
}

export interface DebateMessage {
  agent: string;
  content: string;
}

export interface AgentContext {
  task: JiraTask;
  formattedTask: string;
  debateHistory: DebateMessage[];
  testCases?: TestCase[];
}

export interface ReviewResult {
  approved: boolean;
  feedback: string;
  testCases: TestCase[];
}
