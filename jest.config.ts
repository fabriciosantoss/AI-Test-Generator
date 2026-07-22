import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./src",
  testMatch: ["**/tests/**/*.test.ts"],
  clearMocks: true,
  collectCoverageFrom: [
    "agents/**/*.ts",
    "integrations/**/*.ts",
    "!**/*.d.ts",
  ],
  coverageDirectory: "../coverage",
  coverageReporters: ["text", "lcov"],
};

export default config;
