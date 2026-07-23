import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import { gherkinAgent } from "../agents/gherkin";
import { mockTestCase } from "./fixtures";
import { TestCase } from "../types";

jest.mock("@anthropic-ai/sdk");
jest.mock("fs");

const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;
const mockedFs = fs as jest.Mocked<typeof fs>;

const mockFeatureContent = `Feature: Password Reset Flow

  Background:
    Given the user has an active account
    And the user is on the forgot password screen

  @functional @high
  Scenario: Valid password reset with registered email
    When the user enters a valid registered email
    And clicks "Send reset link"
    Then a success message is displayed
    And a reset email is sent within 1 minute`;

describe("Gherkin Agent", () => {
  let clientMock: jest.Mocked<Anthropic>;

  beforeEach(() => {
    clientMock = new MockedAnthropic() as jest.Mocked<Anthropic>;
    clientMock.messages = { create: jest.fn() } as any;

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);
  });

  describe("gherkinAgent()", () => {
    it("should return one FeatureFile per distinct test case type", async () => {
      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "text", text: mockFeatureContent }],
      });

      const result = await gherkinAgent(
        clientMock,
        "PROJ-142",
        "Password reset flow",
        [mockTestCase]
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("functional");
    });

    it("should generate separate feature files for each type", async () => {
      const securityCase: TestCase = {
        ...mockTestCase,
        title: "Rate limit enforcement",
        type: "security",
      };

      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "text", text: mockFeatureContent }],
      });

      const result = await gherkinAgent(
        clientMock,
        "PROJ-142",
        "Password reset flow",
        [mockTestCase, securityCase]
      );

      const types = result.map((f) => f.type);
      expect(types).toContain("functional");
      expect(types).toContain("security");
      expect(result).toHaveLength(2);
    });

    it("should name each file as {type}.feature", async () => {
      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "text", text: mockFeatureContent }],
      });

      const result = await gherkinAgent(
        clientMock,
        "PROJ-142",
        "Password reset flow",
        [mockTestCase]
      );

      expect(result[0].filename).toBe("functional.feature");
    });

    it("should include the generated content in the returned FeatureFile", async () => {
      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "text", text: mockFeatureContent }],
      });

      const result = await gherkinAgent(
        clientMock,
        "PROJ-142",
        "Password reset flow",
        [mockTestCase]
      );

      expect(result[0].content).toBe(mockFeatureContent);
    });

    it("should write each feature file to disk", async () => {
      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "text", text: mockFeatureContent }],
      });

      await gherkinAgent(clientMock, "PROJ-142", "Password reset flow", [mockTestCase]);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("functional.feature"),
        mockFeatureContent,
        "utf-8"
      );
    });

    it("should save files inside output/{taskId}/features/ directory", async () => {
      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "text", text: mockFeatureContent }],
      });

      await gherkinAgent(clientMock, "PROJ-142", "Password reset flow", [mockTestCase]);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(["PROJ-142", "features"].join(expect.stringContaining(""))),
        expect.any(String),
        "utf-8"
      );

      const writePath = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][0] as string;
      expect(writePath).toContain("PROJ-142");
      expect(writePath).toContain("features");
    });

    it("should create the output directory if it does not exist", async () => {
      mockedFs.existsSync.mockReturnValue(false);

      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "text", text: mockFeatureContent }],
      });

      await gherkinAgent(clientMock, "PROJ-142", "Password reset flow", [mockTestCase]);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("features"),
        { recursive: true }
      );
    });

    it("should call Claude once per distinct type group", async () => {
      const edgeCase: TestCase = { ...mockTestCase, type: "edge_case" };
      const negativeCase: TestCase = { ...mockTestCase, type: "negative" };

      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "text", text: mockFeatureContent }],
      });

      await gherkinAgent(
        clientMock,
        "PROJ-142",
        "Password reset flow",
        [mockTestCase, edgeCase, negativeCase]
      );

      expect(clientMock.messages.create).toHaveBeenCalledTimes(3);
    });

    it("should return an empty array when no test cases are provided", async () => {
      const result = await gherkinAgent(clientMock, "PROJ-142", "Password reset flow", []);

      expect(result).toHaveLength(0);
      expect(clientMock.messages.create).not.toHaveBeenCalled();
    });

    it("should include the task summary in the Claude prompt", async () => {
      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "text", text: mockFeatureContent }],
      });

      await gherkinAgent(clientMock, "PROJ-142", "Password reset flow via email", [mockTestCase]);

      const call = (clientMock.messages.create as jest.Mock).mock.calls[0][0];
      const userContent = call.messages[0].content as string;

      expect(userContent).toContain("Password reset flow via email");
    });

    it("should return empty content when Claude returns a non-text block", async () => {
      (clientMock.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: "tool_use", id: "1", name: "t", input: {} }],
      });

      const result = await gherkinAgent(
        clientMock,
        "PROJ-142",
        "Password reset flow",
        [mockTestCase]
      );

      expect(result[0].content).toBe("");
    });
  });
});
