/// <reference types="node" />
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import fs from "fs/promises";
import path from "path";
import { getLoadConfig, type LoadConfig } from "./loadConfig";
import { roundObject, summarise, toCsv } from "./stats";

declare global {
  interface Window {
    __STUDENT_STATUS_LOAD_TEST_RUN_ID__?: string;
    __STUDENT_STATUS_LOAD_TEST_CLIENT_ID__?: string;
    __STUDENT_STATUS_LOAD_TEST_ACTION_ID__?: string | null;
    __recordStudentStatusLoadEvent?: (event: Record<string, unknown>) => void;
  }
}

type Status = "working" | "help" | "dnd";

type BrowserEvent = {
  type: string;
  runId?: string | null;
  actionId?: string | null;
  timestamp: number;
  performanceTime: number;
  source: "teacher" | "student";
  pageName: string;
  receivedAt: number;
  sessionId?: string;
  studentId?: string;
  studentName?: string;
  status?: Status;
  helpText?: string;
  durationMs?: number;
  studentCount?: number;
  students?: Array<{
    id: string;
    name?: string;
    status?: Status;
    active?: boolean;
    helpText?: string;
    loadTestActionId?: string | null;
  }>;
  errorMessage?: string;
  [key: string]: unknown;
};

type StudentClient = {
  index: number;
  name: string;
  context: BrowserContext;
  page: Page;
  events: BrowserEvent[];
  currentStatus: Status;
  successfulActions: number;
  failedActions: number;
};

type ActionResult = {
  actionId: string;
  studentName: string;
  targetStatus: Status;
  helpText: string;
  startedAt: number;
  writeCommittedAt: number | null;
  teacherSnapshotAt: number | null;
  teacherRenderedAt: number | null;
  clickToWriteCommitMs: number | null;
  commitToTeacherSnapshotMs: number | null;
  commitToTeacherRenderedMs: number | null;
  totalClickToTeacherRenderedMs: number | null;
  success: boolean;
  errorMessage: string | null;
  estimatedDocumentWrites: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomStatus(current: Status): Status {
  const statuses: Status[] = ["working", "help", "dnd"];
  const available = statuses.filter((status) => status !== current);
  return available[randomInt(0, available.length - 1)];
}

function statusTestId(status: Status) {
  if (status === "working") return "status-working";
  if (status === "help") return "status-help";
  return "status-dnd";
}

async function waitUntil<T>(
  description: string,
  producer: () => T | null | undefined,
  timeoutMs: number,
  intervalMs = 50
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = producer();
    if (value) return value;
    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${description}`);
}

async function installEventBridge(
  page: Page,
  source: "teacher" | "student",
  pageName: string,
  runId: string,
  events: BrowserEvent[]
) {
  await page.exposeFunction("__recordStudentStatusLoadEvent", (event: Record<string, unknown>) => {
    events.push({
      ...(event as BrowserEvent),
      source,
      pageName,
      receivedAt: Date.now(),
    });
  });

  await page.addInitScript(({ loadRunId }) => {
    window.__STUDENT_STATUS_LOAD_TEST_RUN_ID__ = loadRunId;

    window.addEventListener("student-status-load-test-event", (rawEvent) => {
      const event = rawEvent as CustomEvent;
      window.__recordStudentStatusLoadEvent?.(event.detail);
    });
  }, { loadRunId: runId });
}

async function createTeacher(
  browser: Browser,
  config: LoadConfig,
  runId: string,
  sessionId: string,
  roomName: string,
  teacherEvents: BrowserEvent[]
) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await installEventBridge(page, "teacher", "teacher-dashboard", runId, teacherEvents);

  page.on("console", (message) => {
    if (message.type() === "error") {
      teacherEvents.push({
        type: "browser:console-error",
        source: "teacher",
        pageName: "teacher-dashboard",
        receivedAt: Date.now(),
        timestamp: Date.now(),
        performanceTime: 0,
        errorMessage: message.text(),
      });
    }
  });

  page.on("pageerror", (error) => {
    teacherEvents.push({
      type: "browser:page-error",
      source: "teacher",
      pageName: "teacher-dashboard",
      receivedAt: Date.now(),
      timestamp: Date.now(),
      performanceTime: 0,
      errorMessage: error.message,
    });
  });

  await page.goto(config.appUrl, { waitUntil: "networkidle" });
  await page.getByTestId("role-teacher").click();
  await page.getByTestId("teacher-room-name").fill(roomName);
  await page.getByTestId("teacher-room-code").fill(sessionId);
  await page.getByTestId("teacher-create-room").click();
  await page.getByTestId("teacher-dashboard").waitFor({ timeout: config.actionTimeoutMs });

  return { context, page };
}

async function createStudent(
  browser: Browser,
  config: LoadConfig,
  runId: string,
  sessionId: string,
  index: number
): Promise<StudentClient> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const events: BrowserEvent[] = [];
  const name = `Student ${String(index + 1).padStart(3, "0")}`;

  await installEventBridge(page, "student", name, runId, events);

  page.on("console", (message) => {
    if (message.type() === "error") {
      events.push({
        type: "browser:console-error",
        source: "student",
        pageName: name,
        receivedAt: Date.now(),
        timestamp: Date.now(),
        performanceTime: 0,
        studentName: name,
        errorMessage: message.text(),
      });
    }
  });

  page.on("pageerror", (error) => {
    events.push({
      type: "browser:page-error",
      source: "student",
      pageName: name,
      receivedAt: Date.now(),
      timestamp: Date.now(),
      performanceTime: 0,
      studentName: name,
      errorMessage: error.message,
    });
  });

  await page.goto(config.appUrl, { waitUntil: "networkidle" });
  await page.getByTestId("role-student").click();
  await page.getByTestId("student-name").fill(name);
  await page.getByTestId("student-room-code").fill(sessionId);
  await page.getByTestId("student-join-room").click();
  await page.getByTestId("student-current-status").waitFor({ timeout: config.actionTimeoutMs });

  return {
    index,
    name,
    context,
    page,
    events,
    currentStatus: "working",
    successfulActions: 0,
    failedActions: 0,
  };
}

function teacherHasAction(
  teacherEvents: BrowserEvent[],
  type: "teacher:students-snapshot" | "teacher:students-rendered",
  actionId: string,
  studentName: string,
  targetStatus: Status,
  helpText: string
) {
  return teacherEvents.find((event) => {
    if (event.type !== type) return false;
    if (!event.students) return false;

    return event.students.some((student) => {
      if (student.name !== studentName) return false;
      if (student.status !== targetStatus) return false;
      if (student.loadTestActionId !== actionId) return false;
      if (targetStatus === "help" && student.helpText !== helpText) return false;
      return true;
    });
  }) ?? null;
}

async function performStudentAction(
  student: StudentClient,
  teacherEvents: BrowserEvent[],
  config: LoadConfig,
  runId: string
): Promise<ActionResult> {
  const targetStatus = randomStatus(student.currentStatus);
  const actionId = `${runId}-${student.index}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const helpText = targetStatus === "help" ? `Load test help request ${actionId}` : "";
  const startedAt = Date.now();

  const result: ActionResult = {
    actionId,
    studentName: student.name,
    targetStatus,
    helpText,
    startedAt,
    writeCommittedAt: null,
    teacherSnapshotAt: null,
    teacherRenderedAt: null,
    clickToWriteCommitMs: null,
    commitToTeacherSnapshotMs: null,
    commitToTeacherRenderedMs: null,
    totalClickToTeacherRenderedMs: null,
    success: false,
    errorMessage: null,
    estimatedDocumentWrites: targetStatus === "help" ? 4 : 2,
  };

  try {
    await student.page.evaluate((id) => {
      window.__STUDENT_STATUS_LOAD_TEST_ACTION_ID__ = id;
    }, actionId);

    if (targetStatus === "help") {
      student.page.once("dialog", async (dialog) => {
        await dialog.accept(helpText);
      });
    }

    await student.page.getByTestId(statusTestId(targetStatus)).click();

    const commitEvent = await waitUntil(
      `student write commit for ${actionId}`,
      () => student.events.find((event) => event.type === "student:status-write-commit" && event.actionId === actionId),
      config.actionTimeoutMs
    );

    result.writeCommittedAt = commitEvent.receivedAt;
    result.clickToWriteCommitMs = commitEvent.receivedAt - startedAt;

    const snapshotEvent = await waitUntil(
      `teacher snapshot for ${actionId}`,
      () => teacherHasAction(teacherEvents, "teacher:students-snapshot", actionId, student.name, targetStatus, helpText),
      config.actionTimeoutMs
    );

    result.teacherSnapshotAt = snapshotEvent.receivedAt;
    result.commitToTeacherSnapshotMs = Math.max(
      0,
      snapshotEvent.receivedAt - commitEvent.receivedAt
    );

    const renderedEvent = await waitUntil(
      `teacher render for ${actionId}`,
      () => teacherHasAction(teacherEvents, "teacher:students-rendered", actionId, student.name, targetStatus, helpText),
      config.actionTimeoutMs
    );

    result.teacherRenderedAt = renderedEvent.receivedAt;
    result.commitToTeacherRenderedMs = Math.max(
      0,
      renderedEvent.receivedAt - commitEvent.receivedAt
    );
    result.totalClickToTeacherRenderedMs = renderedEvent.receivedAt - startedAt;
    result.success = true;

    student.currentStatus = targetStatus;
    student.successfulActions += 1;
  } catch (error) {
    result.errorMessage = error instanceof Error ? error.message : String(error);
    student.failedActions += 1;
  } finally {
    await student.page.evaluate(() => {
      window.__STUDENT_STATUS_LOAD_TEST_ACTION_ID__ = null;
    });
  }

  return result;
}

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(roundObject(data), null, 2));
}

async function main() {
  const config = getLoadConfig();
  const runId = `${config.scenarioName}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const sessionId = `load-${Date.now().toString(36)}`;
  const roomName = `Load Test ${config.scenarioName}`;
  const runDir = path.join(config.outputDir, runId);

  await fs.mkdir(runDir, { recursive: true });

  const browser = await chromium.launch({ headless: config.headless });
  const teacherEvents: BrowserEvent[] = [];
  const actions: ActionResult[] = [];
  const students: StudentClient[] = [];
  const startedAt = Date.now();

  console.log(`Scenario: ${config.scenarioName}`);
  console.log(`App: ${config.appUrl}`);
  console.log(`Room: ${sessionId}`);
  console.log(`Students: ${config.students}`);

  try {
    const teacher = await createTeacher(browser, config, runId, sessionId, roomName, teacherEvents);

    for (let i = 0; i < config.students; i += config.joinBatchSize) {
      const batchIndexes = Array.from(
        { length: Math.min(config.joinBatchSize, config.students - i) },
        (_, offset) => i + offset
      );

      const batch = await Promise.all(
        batchIndexes.map((index) => createStudent(browser, config, runId, sessionId, index))
      );

      students.push(...batch);
      console.log(`Joined ${students.length}/${config.students} students`);

      if (students.length < config.students) {
        await sleep(config.joinBatchDelayMs);
      }
    }

    await waitUntil(
      "teacher dashboard to render all joined students",
      () => teacherEvents.find((event) => event.type === "teacher:students-rendered" && event.studentCount === config.students),
      config.actionTimeoutMs
    );

    const stopAt = Date.now() + config.durationSeconds * 1000;

    await Promise.all(students.map(async (student) => {
      while (Date.now() < stopAt) {
        await sleep(randomInt(config.minThinkTimeMs, config.maxThinkTimeMs));
        if (Date.now() >= stopAt) break;

        const action = await performStudentAction(student, teacherEvents, config, runId);
        actions.push(action);
      }
    }));

    const finishedAt = Date.now();
    const durationMinutes = (finishedAt - startedAt) / 60000;
    const successfulActions = actions.filter((action) => action.success);
    const failedActions = actions.filter((action) => !action.success);
    const allStudentEvents = students.flatMap((student) => student.events);
    const browserErrors = [...teacherEvents, ...allStudentEvents].filter((event) => event.type.includes("error"));

    const summary = {
      runId,
      scenarioName: config.scenarioName,
      appUrl: config.appUrl,
      sessionId,
      roomName,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationSecondsConfigured: config.durationSeconds,
      durationSecondsActual: (finishedAt - startedAt) / 1000,
      studentsConfigured: config.students,
      studentsJoined: students.length,
      totalActions: actions.length,
      successfulActions: successfulActions.length,
      failedActions: failedActions.length,
      successRate: actions.length === 0 ? 0 : successfulActions.length / actions.length,
      actionsPerMinute: actions.length / durationMinutes,
      successfulActionsPerMinute: successfulActions.length / durationMinutes,
      estimatedDocumentWrites: actions.reduce((sum, action) => sum + action.estimatedDocumentWrites, 0) + students.length + 1,
      browserErrorCount: browserErrors.length,
      metrics: {
        clickToWriteCommitMs: summarise(successfulActions.map((action) => action.clickToWriteCommitMs).filter((value): value is number => value !== null)),
        commitToTeacherSnapshotMs: summarise(successfulActions.map((action) => action.commitToTeacherSnapshotMs).filter((value): value is number => value !== null)),
        commitToTeacherRenderedMs: summarise(successfulActions.map((action) => action.commitToTeacherRenderedMs).filter((value): value is number => value !== null)),
        totalClickToTeacherRenderedMs: summarise(successfulActions.map((action) => action.totalClickToTeacherRenderedMs).filter((value): value is number => value !== null)),
      },
      config,
    };

    await writeJson(path.join(runDir, "summary.json"), summary);
    await writeJson(path.join(runDir, "actions.json"), actions);
    await fs.writeFile(path.join(runDir, "actions.csv"), toCsv(actions as unknown as Record<string, unknown>[]));
    await writeJson(path.join(runDir, "teacher-events.json"), teacherEvents);
    await writeJson(path.join(runDir, "student-events.json"), allStudentEvents);
    await writeJson(path.join(runDir, "browser-errors.json"), browserErrors);

    console.log(JSON.stringify(roundObject(summary), null, 2));

    await teacher.context.close();
  } finally {
    await Promise.allSettled(students.map((student) => student.context.close()));
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
