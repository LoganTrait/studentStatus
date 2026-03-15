import { useEffect, useState } from "react";
import {
  updateStudentStatus,
  leaveSession,
  listenToStudents,
  listenToRoom,
} from "../firebase";
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

  // Listen for student removal
  useEffect(() => {
    let seen = false;

    return listenToStudents(sessionId, (students) => {
      const exists = students.some((s) => s.id === studentId);

      if (exists) {
        seen = true;
        return;
      }

      if (seen && !exists) {
        onExit();
      }
    });
  }, [sessionId, studentId]);

  // Change status
  async function change(newStatus: Status) {
    let newHelpText = helpText;

    if (newStatus === "help") {
      newHelpText =
        prompt(
          "Optional: Describe what you need help with",
          helpText
        ) || "";
    }

    setPrev({ status, helpText });
    setStatus(newStatus);
    setHelpText(newHelpText);

    await updateStudentStatus(
      sessionId,
      studentId,
      newStatus,
      newHelpText
    );
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
      prev.helpText
    );

    setPrev(null);
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
        <div className="small-text">{studentName}</div>

        <div className="divider" />

        <div className="status-row">
          <span>Current status:</span>
          <span
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

        <button className="btn green" onClick={() => change("working")}>
          ✔ Working
        </button>
        <button className="btn red" onClick={() => change("help")}>
          ✋ Need Help
        </button>
        <button className="btn grey" onClick={() => change("dnd")}>
          ⛔ Do Not Disturb
        </button>
        <button className="btn yellow" onClick={undo}>
          ↩ Undo
        </button>

        <div className="divider" />

        <button className="btn red" onClick={confirmLeave}>
          Leave Room
        </button>
      </div>
    </div>
  );
}