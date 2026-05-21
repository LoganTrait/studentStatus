import "../styles/ui.css";

export default function RoleSelect({ onSelect }: { onSelect: (r: "student" | "teacher") => void }) {
  return (
    <div className="app-center">
      <div className="card">
        <h2>Select Role</h2>
        <div className="divider" />
        <button className="btn green" data-testid="role-student" onClick={() => onSelect("student")}>
          Student
        </button>
        <button className="btn blue" data-testid="role-teacher" onClick={() => onSelect("teacher")}>
          Teacher
        </button>
      </div>
    </div>
  );
}
