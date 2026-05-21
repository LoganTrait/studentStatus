export type LoadTestEventDetails = {
  sessionId?: string;
  studentId?: string;
  studentName?: string;
  status?: "working" | "help" | "dnd";
  helpText?: string;
  roomName?: string | null;
  durationMs?: number;
  studentCount?: number;
  changeCount?: number;
  students?: Array<{
    id: string;
    name?: string;
    status?: string;
    active?: boolean;
    helpText?: string;
    loadTestActionId?: string | null;
  }>;
  errorMessage?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    __STUDENT_STATUS_LOAD_TEST_ACTION_ID__?: string | null;
    __STUDENT_STATUS_LOAD_TEST_RUN_ID__?: string | null;
  }
}

export function getCurrentLoadTestActionId() {
  if (typeof window === "undefined") return null;
  return window.__STUDENT_STATUS_LOAD_TEST_ACTION_ID__ ?? null;
}

export function emitLoadTestEvent(type: string, details: LoadTestEventDetails = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("student-status-load-test-event", {
      detail: {
        type,
        runId: window.__STUDENT_STATUS_LOAD_TEST_RUN_ID__ ?? null,
        actionId: window.__STUDENT_STATUS_LOAD_TEST_ACTION_ID__ ?? null,
        timestamp: Date.now(),
        performanceTime: performance.now(),
        ...details,
      },
    })
  );
}
