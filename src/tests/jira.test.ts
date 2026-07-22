import fs from "fs";
import path from "path";
import { getTask, formatTaskForAgent } from "../integrations/jira";
import { mockTask } from "./fixtures";

// Mock the fs module to avoid reading real files in tests
jest.mock("fs");

const mockedFs = fs as jest.Mocked<typeof fs>;

describe("Jira Integration", () => {
  const sampleFilePath = path.resolve(__dirname, "../../../samples/task_example.json");

  beforeEach(() => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockTask) as any);
  });

  describe("getTask()", () => {
    it("should return a task with the provided taskId overriding the file id", () => {
      const task = getTask("PROJ-999");

      expect(task.id).toBe("PROJ-999");
      expect(task.summary).toBe(mockTask.summary);
      expect(task.labels).toEqual(mockTask.labels);
    });

    it("should throw an error when the sample file does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => getTask("PROJ-001")).toThrow("Sample file not found");
    });

    it("should return all required JiraTask fields", () => {
      const task = getTask("PROJ-142");

      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("summary");
      expect(task).toHaveProperty("description");
      expect(task).toHaveProperty("type");
      expect(task).toHaveProperty("priority");
      expect(task).toHaveProperty("labels");
    });

    it("should preserve original task data except for the id", () => {
      const task = getTask("PROJ-999");

      expect(task.summary).toBe(mockTask.summary);
      expect(task.description).toBe(mockTask.description);
      expect(task.type).toBe(mockTask.type);
      expect(task.priority).toBe(mockTask.priority);
    });
  });

  describe("formatTaskForAgent()", () => {
    it("should include all task fields in the formatted string", () => {
      const formatted = formatTaskForAgent(mockTask);

      expect(formatted).toContain("TASK ID: PROJ-142");
      expect(formatted).toContain("SUMMARY: Implement password reset flow via email");
      expect(formatted).toContain("TYPE: Story");
      expect(formatted).toContain("PRIORITY: High");
      expect(formatted).toContain("LABELS: authentication, security, email");
      expect(formatted).toContain("DESCRIPTION:");
    });

    it("should join multiple labels with a comma", () => {
      const task = { ...mockTask, labels: ["auth", "security", "regression"] };
      const formatted = formatTaskForAgent(task);

      expect(formatted).toContain("LABELS: auth, security, regression");
    });

    it("should handle a task with no labels", () => {
      const task = { ...mockTask, labels: [] };
      const formatted = formatTaskForAgent(task);

      expect(formatted).toContain("LABELS: ");
    });

    it("should include the full description", () => {
      const formatted = formatTaskForAgent(mockTask);

      expect(formatted).toContain(mockTask.description);
    });
  });
});
