import Anthropic from "@anthropic-ai/sdk";
import { readerAgent } from "../agents/reader";
import { mockAgentContext } from "./fixtures";

jest.mock("@anthropic-ai/sdk");

const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe("Reader Agent", () => {
  let clientMock: jest.Mocked<Anthropic>;

  beforeEach(() => {
    clientMock = new MockedAnthropic() as jest.Mocked<Anthropic>;

    clientMock.messages = {
      create: jest.fn(),
    } as any;
  });

  it("should return the text content from Claude's response", async () => {
    const expectedAnalysis = "Core functionalities: password reset, email verification...";

    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: expectedAnalysis }],
    });

    const result = await readerAgent(clientMock, { ...mockAgentContext });

    expect(result).toBe(expectedAnalysis);
  });

  it("should call the Claude API with the correct model", async () => {
    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: "analysis" }],
    });

    await readerAgent(clientMock, { ...mockAgentContext });

    expect(clientMock.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4-6" })
    );
  });

  it("should include the formatted task in the user message", async () => {
    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: "analysis" }],
    });

    await readerAgent(clientMock, { ...mockAgentContext });

    const call = (clientMock.messages.create as jest.Mock).mock.calls[0][0];
    const userMessage = call.messages[0].content as string;

    expect(userMessage).toContain(mockAgentContext.formattedTask);
  });

  it("should return an empty string when response content is not text type", async () => {
    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "tool_use", id: "123", name: "tool", input: {} }],
    });

    const result = await readerAgent(clientMock, { ...mockAgentContext });

    expect(result).toBe("");
  });

  it("should call the API exactly once", async () => {
    (clientMock.messages.create as jest.Mock).mockResolvedValue({
      content: [{ type: "text", text: "analysis" }],
    });

    await readerAgent(clientMock, { ...mockAgentContext });

    expect(clientMock.messages.create).toHaveBeenCalledTimes(1);
  });
});
