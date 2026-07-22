import fs from "fs";
import { createTestCases } from "../integrations/zephyr";
import { mockTestCase } from "./fixtures";
import { TestCase } from "../types";

jest.mock("fs");

const mockedFs = fs as jest.Mocked<typeof fs>;

describe("Zephyr Integration", () => {
  beforeEach(() => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);
  });

  describe("createTestCases()", () => {
    it("should return one ZephyrTestCase per TestCase provided", () => {
      const result = createTestCases("PROJ-142", [mockTestCase]);

      expect(result).toHaveLength(1);
    });

    it("should generate keys with the correct format {taskId}-TC-{index}", () => {
      const result = createTestCases("PROJ-142", [mockTestCase, mockTestCase]);

      expect(result[0].key).toBe("PROJ-142-TC-001");
      expect(result[1].key).toBe("PROJ-142-TC-002");
    });

    it("should map TestCase fields to ZephyrTestCase correctly", () => {
      const result = createTestCases("PROJ-142", [mockTestCase]);
      const zephyr = result[0];

      expect(zephyr.name).toBe(mockTestCase.title);
      expect(zephyr.objective).toBe(mockTestCase.objective);
      expect(zephyr.priority).toBe(mockTestCase.priority);
      expect(zephyr.labels).toContain(mockTestCase.type);
      expect(zephyr.status).toBe("Draft");
    });

    it("should join preconditions into a single string separated by newlines", () => {
      const result = createTestCases("PROJ-142", [mockTestCase]);

      expect(result[0].precondition).toBe(mockTestCase.preconditions.join("\n"));
    });

    it("should set the last step's expectedResult from the TestCase", () => {
      const result = createTestCases("PROJ-142", [mockTestCase]);
      const steps = result[0].testScript.steps;
      const lastStep = steps[steps.length - 1];

      expect(lastStep.expectedResult).toBe(mockTestCase.expectedResult);
    });

    it("should set intermediate steps expectedResult as a generic success message", () => {
      const multiStepCase: TestCase = {
        ...mockTestCase,
        steps: ["Step 1", "Step 2", "Step 3"],
      };
      const result = createTestCases("PROJ-142", [multiStepCase]);
      const steps = result[0].testScript.steps;

      expect(steps[0].expectedResult).toBe("Step completed successfully");
      expect(steps[1].expectedResult).toBe("Step completed successfully");
      expect(steps[2].expectedResult).toBe(mockTestCase.expectedResult);
    });

    it("should create the output directory if it does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);

      createTestCases("PROJ-142", [mockTestCase]);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("output"),
        { recursive: true }
      );
    });

    it("should write the output file to disk", () => {
      createTestCases("PROJ-142", [mockTestCase]);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("PROJ-142_test_cases.json"),
        expect.any(String)
      );
    });

    it("should return an empty array when given no test cases", () => {
      const result = createTestCases("PROJ-142", []);

      expect(result).toHaveLength(0);
    });
  });
});
