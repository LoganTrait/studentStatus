import { useEffect, useState } from "react";
import {
  updateStudentStatus,
  leaveSession,
  listenToStudent,
  listenToRoom,
  resolveHelpRequest,
} from "../firebase";
import { emitLoadTestEvent } from "../loadTestEvents";
import "../styles/ui.css";

// Student statuses
type Status = "working" | "help" | "dnd";

export default function StudentStatus({
  sessionId,
  studentId,
  studentName,
  onExit,
}: any) {
  const [status, setStatus] = useState<Status>("working");
  const [helpText, setHelpText] = useState("");
  const [roomName, setRoomName] = useState("");

  // Store previous state for undo
  const [prev, setPrev] = useState<{
    status: Status;
    helpText: string;
  } | null>(null);

  // Update room name and listen for room deletion
  useEffect(() => {
    const unsub = listenToRoom(sessionId, (name) => {
      if (!name) onExit();
      else setRoomName(name);
    });
    return unsub;
  }, [sessionId]);

  useEffect(() => {
    return listenToStudent(sessionId, studentId, (data) => {
      if (!data.active) {
        onExit(); // student removed or left
        return;
      }

      emitLoadTestEvent("student:self-snapshot", {
        sessionId,
        studentId,
        studentName,
        status: data.status,
        helpText: data.helpText || "",
        loadTestActionId: data.loadTestActionId ?? null
      });

      // Update status and help text from firebase
      setStatus(data.status);
      setHelpText(data.helpText || "");
    });
  }, [sessionId, studentId]);

  // Change status
  async function change(newStatus: Status) {
    const startedAt = performance.now();
    let newHelpText = helpText;

    if (newStatus === "help") {
      newHelpText =
        prompt(
          "Optional: Describe what you need help with",
          helpText
        ) || "";
    }

    emitLoadTestEvent("student:status-click", {
      sessionId,
      studentId,
      studentName,
      status: newStatus,
      helpText: newHelpText
    });

    setPrev({ status, helpText });
    setStatus(newStatus);
    setHelpText(newHelpText);

    try {
      await updateStudentStatus(
        sessionId,
        studentId,
        newStatus,
        newHelpText,
        studentName
      );

      emitLoadTestEvent("student:status-write-commit", {
        sessionId,
        studentId,
        studentName,
        status: newStatus,
        helpText: newHelpText,
        durationMs: performance.now() - startedAt,
        estimatedDocumentWrites: newStatus === "help" ? 4 : 2
      });
    } catch (error) {
      emitLoadTestEvent("student:status-write-error", {
        sessionId,
        studentId,
        studentName,
        status: newStatus,
        helpText: newHelpText,
        durationMs: performance.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  // Undo last status change
  async function undo() {
    if (!prev) return;

    setStatus(prev.status);
    setHelpText(prev.helpText);

    await updateStudentStatus(
      sessionId,
      studentId,
      prev.status,
      prev.helpText,
      studentName
    );

    setPrev(null);
  }

  // Mark help request as resolved
  async function resolveHelp() {
    const startedAt = performance.now();

    try {
      await resolveHelpRequest(sessionId, studentId);

      emitLoadTestEvent("student:resolve-help-commit", {
        sessionId,
        studentId,
        studentName,
        durationMs: performance.now() - startedAt,
        estimatedDocumentReads: 1,
        estimatedDocumentWrites: 2
      });
    } catch (error) {
      emitLoadTestEvent("student:resolve-help-error", {
        sessionId,
        studentId,
        studentName,
        durationMs: performance.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  // Leave room
  async function confirmLeave() {
    if (!confirm("Leave the room?")) return;
    await leaveSession(sessionId, studentId);
    onExit();
  }

  return (
    <div className="app-center">
      <div className="card">
        <h2>{roomName}</h2>
        <div className="small-text" data-testid="student-display-name">{studentName}</div>

        <div className="divider" />

        <div className="status-row">
          <span>Current status:</span>
          <span
            data-testid="student-current-status"
            data-status={status}
            className={`status-pill ${
              status === "working"
                ? "green"
                : status === "help"
                ? "red"
                : "grey"
            }`}
          >
            {status === "working"
              ? "WORKING"
              : status === "help"
              ? "NEED HELP"
              : "DO NOT DISTURB"}
          </span>
        </div>

        <div className="divider" />

        <button className="btn green" data-testid="status-working" onClick={() => change("working")}>
          ✔ Working
        </button>
        <button className="btn red" data-testid="status-help" onClick={() => change("help")}>
          ✋ Need Help
        </button>
        <button className="btn grey" data-testid="status-dnd" onClick={() => change("dnd")}>
          ⛔ Do Not Disturb
        </button>
        <button className="btn yellow" data-testid="status-undo" onClick={undo}>
          ↩ Undo
        </button>
        {status === "help" && (
          <button className="btn green" data-testid="student-resolve-help" onClick={resolveHelp}>
            Help Resolved
          </button>
        )}
        <div className="divider" />

        <button className="btn red" data-testid="student-leave-room" onClick={confirmLeave}>
          Leave Room
        </button>
      </div>
    </div>
  );
}
