/// <reference types="node" />
export type LoadConfig = {
  appUrl: string;
  scenarioName: string;
  students: number;
  durationSeconds: number;
  minThinkTimeMs: number;
  maxThinkTimeMs: number;
  joinBatchSize: number;
  joinBatchDelayMs: number;
  headless: boolean;
  actionTimeoutMs: number;
  outputDir: string;
};

function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number. Received: ${value}`);
  }

  return parsed;
}

function booleanFromEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (!value) return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

export function getLoadConfig(): LoadConfig {
  return {
    appUrl: process.env.APP_URL || "PUT_LINK_HERE",
    scenarioName: process.env.SCENARIO_NAME || "baselinetest",
    students: numberFromEnv("STUDENTS", 30),
    durationSeconds: numberFromEnv("DURATION_SECONDS", 600),
    minThinkTimeMs: numberFromEnv("MIN_THINK_TIME_MS", 5000),
    maxThinkTimeMs: numberFromEnv("MAX_THINK_TIME_MS", 15000),
    joinBatchSize: numberFromEnv("JOIN_BATCH_SIZE", 5),
    joinBatchDelayMs: numberFromEnv("JOIN_BATCH_DELAY_MS", 1000),
    headless: booleanFromEnv("HEADLESS", true),
    actionTimeoutMs: numberFromEnv("ACTION_TIMEOUT_MS", 15000),
    outputDir: process.env.OUTPUT_DIR || "load-test-results",
  };
}
