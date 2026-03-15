import { useState } from "react";
import { createSession, getSession, reopenSession } from "../firebase";
import "../styles/ui.css";

type Props = {
  onEnter: (sessionId: string, roomName: string) => void;
  onBack: () => void;
};

export default function TeacherRoom({ onEnter, onBack }: Props) {
  // Active tab
  const [tab, setTab] = useState<"create" | "open">("create");

  // Form states
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  // Error message
  const [error, setError] = useState("");

  // Create room
  async function handleCreate() {
    if (!roomName || !roomCode) {
      setError("Room name and code are required");
      return;
    }

    setError("");

    // Create session doc in firebase
    await createSession(roomCode.trim(), roomName.trim());

    // Enter session
    onEnter(roomCode.trim(), roomName.trim());
  }

  // Open existing room
  async function handleOpen() {
    if (!roomCode) {
      setError("Enter a room code");
      return;
    }

    setError("");

    // Fetch session from firebase
    const session = await getSession(roomCode.trim());

    if (!session) {
      setError("Room not found");
      return;
    }

    await reopenSession(roomCode.trim());

    // Enter session
    onEnter(roomCode.trim(), session.name || "");
  }

  return (
    <div className="app-center">
      <div className="card">
        <h2>Create or Join a Room</h2>
        <div className="divider" />

        {/* Category tabs */}
        <div className="tabs">
          <div
            className={`tab ${tab === "create" ? "active" : ""}`}
            onClick={() => setTab("create")}
          >
            Create
          </div>
          <div
            className={`tab ${tab === "open" ? "active" : ""}`}
            onClick={() => setTab("open")}
          >
            Join
          </div>
        </div>

        <div className="divider" />

        {/* Create Room */}
        {tab === "create" && (
          <>
            <div className="input">
              <span>🏷️</span>
              <input
                placeholder="Room name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>

            <div className="input">
              <span>🔑</span>
              <input
                placeholder="Room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
            </div>

            <button className="btn green" onClick={handleCreate}>
              Create Room
            </button>
          </>
        )}

        {/* Open Room */}
        {tab === "open" && (
          <>
            <div className="input">
              <span>🔑</span>
              <input
                placeholder="Room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
            </div>

            <button className="btn blue" onClick={handleOpen}>
              Join Room
            </button>
          </>
        )}

        {error && (
          <div className="small-text" style={{ color: "#e74c3c" }}>
            {error}
          </div>
        )}

        {/* Back button */}
        <button className="btn back-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}