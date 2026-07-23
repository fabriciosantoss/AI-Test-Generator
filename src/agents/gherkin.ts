/**
 * Gherkin Agent
 * -------------
 * Converts structured TestCase objects into Gherkin (.feature) files.
 *
 * Groups test cases by type into separate feature files:
 *   - functional.feature
 *   - security.feature
 *   - edge_case.feature
 *   - negative.feature
 *   - ui.feature
 *
 * Each file follows the standard Gherkin format:
 *   Feature > Background (shared preconditions) > Scenario per test case
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { TestCase } from "../types";

const OUTPUT_DIR = path.resolve(__dirname, "../../output");

const SYSTEM_PROMPT = `You are a QA Engineer expert in BDD and Gherkin syntax.

Convert the provided test cases into a valid Gherkin .feature file.

Rules:
- Use standard Gherkin keywords: Feature, Background, Scenario, Given, When, Then, And
- Feature title should reflect the group of test cases
- Use Background for preconditions shared across all scenarios
- Each TestCase becomes one Scenario
- Steps must be written in third-person present tense ("the user clicks", "the system sends")
- Tags: use @<type> and @<priority> on each scenario (e.g. @functional @high)
- Do NOT add any explanation or markdown — output only valid Gherkin text

Example format:
Feature: Password Reset Flow

  Background:
    Given the user has an active account
    And the user is on the forgot password screen

  @functional @high
  Scenario: Valid password reset with registered email
    When the user enters a valid registered email
    And clicks "Send reset link"
    Then a success message is displayed
    And a reset email is sent within 1 minute`;

type TestCaseType = TestCase["type"];

export interface FeatureFile {
  filename: string;
  type: TestCaseType;
  content: string;
  path: string;
}

async function generateFeatureContent(
  client: Anthropic,
  taskSummary: string,
  type: TestCaseType,
  testCases: TestCase[]
): Promise<string> {
  const testCasesJson = JSON.stringify(testCases, null, 2);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Task: ${taskSummary}\nType: ${type}\n\nTest Cases:\n${testCasesJson}\n\nGenerate the .feature file content.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function gherkinAgent(
  client: Anthropic,
  taskId: string,
  taskSummary: string,
  testCases: TestCase[]
): Promise<FeatureFile[]> {
  console.log("\n🥒 [Gherkin Agent] Generating .feature files...");

  // Group test cases by type
  const grouped = testCases.reduce<Partial<Record<TestCaseType, TestCase[]>>>(
    (acc, tc) => {
      if (!acc[tc.type]) acc[tc.type] = [];
      acc[tc.type]!.push(tc);
      return acc;
    },
    {}
  );

  const featureDir = path.join(OUTPUT_DIR, taskId, "features");
  if (!fs.existsSync(featureDir)) {
    fs.mkdirSync(featureDir, { recursive: true });
  }

  const featureFiles: FeatureFile[] = [];

  for (const [type, cases] of Object.entries(grouped) as [TestCaseType, TestCase[]][]) {
    console.log(`  📄 Generating ${type}.feature (${cases.length} scenarios)...`);

    const content = await generateFeatureContent(client, taskSummary, type, cases);
    const filename = `${type}.feature`;
    const filePath = path.join(featureDir, filename);

    fs.writeFileSync(filePath, content, "utf-8");

    featureFiles.push({ filename, type, content, path: filePath });
  }

  console.log(`✅ [Gherkin Agent] ${featureFiles.length} feature file(s) saved to ${featureDir}`);
  return featureFiles;
}
