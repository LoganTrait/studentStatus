import { useEffect, useState } from "react";
import { listenToStudents, removeStudent, closeSession } from "../firebase";
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

  useEffect(() => listenToStudents(sessionId, setStudents), [sessionId]);

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
  const filtered = students.filter(
    (s) => s.status === tab && s.active !== false
  );

  return (
    <div className="app-center">
      <div className="card">
        <h2>{roomName}</h2>
        <div className="room-code">Room Code: {sessionId}</div>

        <div className="divider" />

        <div className="tabs">
          <div className={`tab ${tab === "help" ? "active" : ""}`} onClick={() => setTab("help")}>
            Need Help ({students.filter(s => s.status === "help" && s.active !== false).length})
          </div>
          <div className={`tab ${tab === "working" ? "active" : ""}`} onClick={() => setTab("working")}>
            Working ({students.filter(s => s.status === "working" && s.active !== false).length})
          </div>
          <div className={`tab ${tab === "dnd" ? "active" : ""}`} onClick={() => setTab("dnd")}>
            Do Not Disturb ({students.filter(s => s.status === "dnd" && s.active !== false).length})
          </div>
        </div>

        {filtered.map((s) => (
          <div
            key={s.id}
            className="student-card"
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
                <button
                  className="btn red"
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

        <button className="btn red" onClick={closeRoom}>
          Close Room
        </button>
      </div>
    </div>
  );
}