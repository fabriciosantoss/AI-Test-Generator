import Anthropic from "@anthropic-ai/sdk";
import { reviewerAgent } from "../agents/reviewer";
import { mockAgentContext, mockReviewResult } from "./fixtures";
import { AgentContext } from "../types";

jest.mock("@anthropic-ai/sdk");

const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe("Reviewer Agent", () => {
  let clientMock: jest.Mocked<Anthropic>;

  const contextWithDebate: AgentContext = {
    ...mockAgentContext,
    debateHistory: [
      { agent: "UI Agent", content: "We should test the forgot password form validation." },
      { agent: "Critical Agent", content: "Token expiry and one-time-use must be covered." },
      { agent: "Edge Case Agent", content: "Test with unregistered email and rate limit breach." },
    ],
  };

  beforeEach(() => {
    clientMock = new MockedAnthropic() as jest.Mocked<Anthropic>;
    clientMock.messages = { create: jest.fn() } as any;
  });

  it("should parse and return a valid ReviewResult from Claude's JSON response", async () => {
    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockReviewResult) }],
    });

    const result = await reviewerAgent(clientMock, contextWithDebate);

    expect(result.approved).toBe(true);
    expect(result.testCases).toHaveLength(1);
    expect(result.feedback).toBeDefined();
  });

  it("should include all TestCase fields in the returned test cases", async () => {
    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockReviewResult) }],
    });

    const result = await reviewerAgent(clientMock, contextWithDebate);
    const tc = result.testCases[0];

    expect(tc).toHaveProperty("title");
    expect(tc).toHaveProperty("objective");
    expect(tc).toHaveProperty("preconditions");
    expect(tc).toHaveProperty("steps");
    expect(tc).toHaveProperty("expectedResult");
    expect(tc).toHaveProperty("type");
    expect(tc).toHaveProperty("priority");
  });

  it("should throw when Claude returns invalid JSON", async () => {
    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: "This is not JSON at all." }],
    });

    await expect(reviewerAgent(clientMock, contextWithDebate)).rejects.toThrow(
      "Reviewer agent returned invalid JSON"
    );
  });

  it("should include the debate history in the user message sent to Claude", async () => {
    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockReviewResult) }],
    });

    await reviewerAgent(clientMock, contextWithDebate);

    const call = (clientMock.messages.create as jest.Mock).mock.calls[0][0];
    const userContent = call.messages[0].content as string;

    expect(userContent).toContain("UI Agent");
    expect(userContent).toContain("Critical Agent");
    expect(userContent).toContain("Edge Case Agent");
  });

  it("should call the Claude API with the correct model", async () => {
    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockReviewResult) }],
    });

    await reviewerAgent(clientMock, contextWithDebate);

    expect(clientMock.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4-6" })
    );
  });

  it("should handle approved: false in the review result", async () => {
    const rejectedResult = { ...mockReviewResult, approved: false, feedback: "Missing edge cases." };

    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(rejectedResult) }],
    });

    const result = await reviewerAgent(clientMock, contextWithDebate);

    expect(result.approved).toBe(false);
    expect(result.feedback).toBe("Missing edge cases.");
  });
});
