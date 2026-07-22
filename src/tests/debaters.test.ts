import Anthropic from "@anthropic-ai/sdk";
import { runDebateRound } from "../agents/debaters";
import { mockAgentContext } from "./fixtures";
import { AgentContext } from "../types";

jest.mock("@anthropic-ai/sdk");

const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe("Debater Agents", () => {
  let clientMock: jest.Mocked<Anthropic>;

  beforeEach(() => {
    clientMock = new MockedAnthropic() as jest.Mocked<Anthropic>;
    clientMock.messages = { create: jest.fn() } as any;

    // Each call returns a different agent response
    (clientMock.messages.create as jest.Mock)
      .mockResolvedValueOnce({ content: [{ type: "text", text: "UI: test the form fields" }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Critical: test token expiry" }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Edge: test rate limiting" }] });
  });

  describe("runDebateRound()", () => {
    it("should return exactly 3 messages — one per debater agent", async () => {
      const context: AgentContext = { ...mockAgentContext, debateHistory: [] };

      const messages = await runDebateRound(clientMock, context, 1);

      expect(messages).toHaveLength(3);
    });

    it("should assign the correct agent names to each message", async () => {
      const context: AgentContext = { ...mockAgentContext, debateHistory: [] };

      const messages = await runDebateRound(clientMock, context, 1);
      const agentNames = messages.map((m) => m.agent);

      expect(agentNames).toContain("UI Agent");
      expect(agentNames).toContain("Critical Agent");
      expect(agentNames).toContain("Edge Case Agent");
    });

    it("should append all 3 messages to the shared debateHistory", async () => {
      const context: AgentContext = { ...mockAgentContext, debateHistory: [] };

      await runDebateRound(clientMock, context, 1);

      expect(context.debateHistory).toHaveLength(3);
    });

    it("should call Claude 3 times — once per debater", async () => {
      const context: AgentContext = { ...mockAgentContext, debateHistory: [] };

      await runDebateRound(clientMock, context, 1);

      expect(clientMock.messages.create).toHaveBeenCalledTimes(3);
    });

    it("should include previous debate history in subsequent agent calls", async () => {
      const context: AgentContext = {
        ...mockAgentContext,
        debateHistory: [
          { agent: "Reader Agent", content: "Initial analysis of the task." },
        ],
      };

      await runDebateRound(clientMock, context, 1);

      // The second agent call should have the first agent's message in context
      const secondCall = (clientMock.messages.create as jest.Mock).mock.calls[1][0];
      const userContent = secondCall.messages[0].content as string;

      expect(userContent).toContain("UI Agent");
    });

    it("should accumulate history across multiple rounds", async () => {
      const context: AgentContext = { ...mockAgentContext, debateHistory: [] };

      // Round 1
      await runDebateRound(clientMock, context, 1);

      // Set up mocks for round 2
      (clientMock.messages.create as jest.Mock)
        .mockResolvedValueOnce({ content: [{ type: "text", text: "UI round 2" }] })
        .mockResolvedValueOnce({ content: [{ type: "text", text: "Critical round 2" }] })
        .mockResolvedValueOnce({ content: [{ type: "text", text: "Edge round 2" }] });

      // Round 2
      await runDebateRound(clientMock, context, 2);

      expect(context.debateHistory).toHaveLength(6);
    });

    it("should return empty string content when Claude returns a non-text block", async () => {
      (clientMock.messages.create as jest.Mock)
        .mockResolvedValueOnce({ content: [{ type: "tool_use", id: "1", name: "t", input: {} }] })
        .mockResolvedValueOnce({ content: [{ type: "text", text: "Critical response" }] })
        .mockResolvedValueOnce({ content: [{ type: "text", text: "Edge response" }] });

      const context: AgentContext = { ...mockAgentContext, debateHistory: [] };
      const messages = await runDebateRound(clientMock, context, 1);

      expect(messages[0].content).toBe("");
    });
  });
});
