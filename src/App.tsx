import { useEffect, useState } from "react";

// Import screens
import RoleSelect from "./screens/RoleSelect";
import StudentJoin from "./screens/StudentJoin";
import StudentStatus from "./screens/StudentStatus";
import TeacherRoom from "./screens/TeacherRoom";
import TeacherDashboard from "./screens/TeacherDashboard";

// Role for student or teacher
type Mode = "student" | "teacher" | null;

// Local storage key for saving session
const STORAGE_KEY = "student-status-app";

export default function App() {
  // Global state
  const [mode, setMode] = useState<Mode>(null);

  // Room state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>("");

  // Student state
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");

  // Restore session info on reload
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);
      setMode(saved.mode ?? null);
      setSessionId(saved.sessionId ?? null);
      setRoomName(saved.roomName ?? "");
      setStudentId(saved.studentId ?? null);
      setStudentName(saved.studentName ?? "");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save session info on change
  useEffect(() => {
    if (!mode) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode,
        sessionId,
        roomName,
        studentId,
        studentName,
      })
    );
  }, [mode, sessionId, roomName, studentId, studentName]);

  // Reset all session info
  function resetAll() {
    setMode(null);
    setSessionId(null);
    setRoomName("");
    setStudentId(null);
    setStudentName("");
    localStorage.removeItem(STORAGE_KEY);
  }

  /*  Routing  */

  // Select role screen
  if (!mode) {
    return <RoleSelect onSelect={setMode} />;
  }

  /*  Student screens  */
  // Student has not joined a room yet
  if (mode === "student") {
    if (!sessionId || !studentId) {
      return (
        <StudentJoin
          onBack={resetAll}
          onJoin={(session, student, name) => {
            setSessionId(session);
            setStudentId(student);
            setStudentName(name);
          }}
        />
      );
    }
    // Student status screen
    return (
      <StudentStatus
        sessionId={sessionId}
        studentId={studentId}
        studentName={studentName}
        onExit={resetAll}
      />
    );
  }

  /*  Teacher screens  */
  // Teacher has not created or joined a room yet
  if (!sessionId) {
    return (
      <TeacherRoom
        onBack={resetAll}
        onEnter={(session, name) => {
          setSessionId(session);
          setRoomName(name);
        }}
      />
    );
  }
  // Teacher dashboard
  return (
    <TeacherDashboard
      sessionId={sessionId}
      roomName={roomName}
      onExit={resetAll}
    />
  );
}