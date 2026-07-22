/**
 * Jira Integration (Mock)
 * -----------------------
 * Simulates Jira API using local JSON files.
 * In production, replace with actual Jira REST API calls:
 * GET /rest/api/3/issue/{taskId}
 */

import fs from "fs";
import path from "path";
import { JiraTask } from "../types";

const SAMPLES_DIR = path.resolve(__dirname, "../../samples");

export function getTask(taskId: string): JiraTask {
  const filePath = path.join(SAMPLES_DIR, "task_example.json");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Sample file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const task: JiraTask = JSON.parse(raw);
  return { ...task, id: taskId };
}

export function formatTaskForAgent(task: JiraTask): string {
  return `
TASK ID: ${task.id}
SUMMARY: ${task.summary}
TYPE: ${task.type}
PRIORITY: ${task.priority}
LABELS: ${task.labels.join(", ")}

DESCRIPTION:
${task.description}
`.trim();
}
