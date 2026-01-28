import { useState } from "react";
import { joinSession } from "../firebase";
import "../styles/ui.css";

type Props = {
  onJoin: (sessionId: string, studentId: string, name: string) => void;
  onBack: () => void;
};

export default function StudentJoin({ onJoin, onBack }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Join room with code
  async function handleJoin() {
    if (!name || !code) {
      setError("Please enter your name and room code");
      return;
    }

    try {
      const studentId = await joinSession(code.trim(), name.trim());
      onJoin(code.trim(), studentId, name.trim());
    } catch {
      setError("Room not found");
    }
  }

  return (
    <div className="app-center">
      <div className="card">
        <h2>Join Room</h2>
        <div className="divider" />

        <div className="input">
          <span>👤</span>
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="input">
          <span>🔑</span>
          <input
            placeholder="Room code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        {error && <div className="small-text">{error}</div>}

        <div className="divider" />

        <button className="btn green" onClick={handleJoin}>
          Join Room
        </button>

        <div className="small-text">
          Only the teacher can see student information
        </div>

        {/* Back button */}
        <button className="btn back-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}