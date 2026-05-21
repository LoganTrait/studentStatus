import { useEffect, useState } from "react";
import { listenToStudents, removeStudent, closeSession, resolveHelpRequest } from "../firebase";
import { emitLoadTestEvent } from "../loadTestEvents";
import "../styles/ui.css";

export default function TeacherDashboard({ sessionId, roomName, onExit }: any) {
  // List of students
  const [students, setStudents] = useState<any[]>([]);

  // Status tabs
  const [tab, setTab] = useState<"help" | "working" | "dnd">("help");

  // ID of expanded student card
  const [openId, setOpenId] = useState<string | null>(null);

  // Live updates
  const [, tick] = useState(0);

  useEffect(() => listenToStudents(sessionId, (nextStudents) => {
    emitLoadTestEvent("teacher:students-snapshot", {
      sessionId,
      roomName,
      studentCount: nextStudents.length,
      students: nextStudents.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        active: s.active,
        helpText: s.helpText || "",
        loadTestActionId: s.loadTestActionId ?? null
      }))
    });

    setStudents(nextStudents);
  }), [sessionId]);

  useEffect(() => {
    emitLoadTestEvent("teacher:students-rendered", {
      sessionId,
      roomName,
      studentCount: students.length,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        active: s.active,
        helpText: s.helpText || "",
        loadTestActionId: s.loadTestActionId ?? null
      }))
    });
  }, [students, sessionId, roomName]);

  // time update every 30 seconds
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Convert firestore timestamp to readable time in minutes (rounded)
  function timeSince(ts: any) {
    if (!ts) return "";
    const mins = Math.floor((Date.now() - ts.toDate()) / 60000);
    return mins < 1 ? "Just now" : `${mins} min`;
  }

  // Remove student
  async function kick(id: string) {
    if (!confirm("Remove student?")) return;
    await removeStudent(sessionId, id);
  }

  // Close room
  async function closeRoom() {
    if (!confirm("Close room?")) return;
    await closeSession(sessionId);
    onExit();
  }

  // Filtered students based on tab
  const filtered = students
    .filter((s) => s.status === tab && s.active !== false)
    .sort((a, b) => {
      if (!a.updatedAt || !b.updatedAt) return 0;
      return a.updatedAt.seconds - b.updatedAt.seconds;
    });

  return (
    <div className="app-center">
      <div className="card" data-testid="teacher-dashboard">
        <h2>{roomName}</h2>
        <div className="room-code" data-testid="teacher-room-code-display">Room Code: {sessionId}</div>

        <div className="divider" />

        <div className="tabs">
          <div className={`tab ${tab === "help" ? "active" : ""}`} data-testid="teacher-tab-help" onClick={() => setTab("help")}>
            Need Help ({students.filter(s => s.status === "help" && s.active !== false).length})
          </div>
          <div className={`tab ${tab === "working" ? "active" : ""}`} data-testid="teacher-tab-working" onClick={() => setTab("working")}>
            Working ({students.filter(s => s.status === "working" && s.active !== false).length})
          </div>
          <div className={`tab ${tab === "dnd" ? "active" : ""}`} data-testid="teacher-tab-dnd" onClick={() => setTab("dnd")}>
            Do Not Disturb ({students.filter(s => s.status === "dnd" && s.active !== false).length})
          </div>
        </div>

        {filtered.map((s) => (
          <div
            key={s.id}
            className="student-card"
            data-testid="teacher-student-card"
            data-student-id={s.id}
            data-student-name={s.name}
            data-status={s.status}
            data-load-test-action-id={s.loadTestActionId || ""}
            onClick={() => setOpenId(openId === s.id ? null : s.id)}
          >
            <div className="student-header">
              <strong>{s.name}</strong>

              <span
                className={`status-pill ${
                  s.status === "help"
                    ? "red"
                    : s.status === "working"
                    ? "green"
                    : "grey"
                }`}
              >
                {s.status === "help"
                  ? "NEED HELP"
                  : s.status === "working"
                  ? "WORKING"
                  : "DO NOT DISTURB"}
              </span>

              {s.status === "help" && (
                <span className="student-time">
                  {timeSince(s.updatedAt)}
                </span>
              )}
            </div>

            {openId === s.id && (
              <>
                {s.helpText && (
                  <div className="help-text">{s.helpText}</div>
                )}
                {s.status === "help" && (
                  <button
                    className="btn green"
                    data-testid="teacher-resolve-help"
                    style={{ marginTop: "0.75rem" }}
                    onClick={() => resolveHelpRequest(sessionId, s.id)}
                  >
                    Student Helped
                  </button>
                )}
                <button
                  className="btn red"
                  data-testid="teacher-remove-student"
                  style={{ marginTop: "0.75rem" }}
                  onClick={() => kick(s.id)}
                >
                  Remove Student
                </button>
              </>
            )}
          </div>
        ))}

        <div className="divider" />

        <button className="btn red" data-testid="teacher-close-room" onClick={closeRoom}>
          Close Room
        </button>
      </div>
    </div>
  );
}
