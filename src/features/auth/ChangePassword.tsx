import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/context/AuthContext";
import { changePassword } from "../../auth/authApi";
import { errorMessage } from "../../api/errors";

export function ChangePassword() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-screen">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>Change password</h1>
        {user?.must_change_password && <p className="muted">You must change your password before continuing.</p>}
        <div className="field">
          <label htmlFor="old">Current password</label>
          <input id="old" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="new">New password</label>
          <input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </div>
        {error && <div className="error-text">{error}</div>}
        <div className="cluster">
          <button className="btn btn--primary" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
          {!user?.must_change_password && <button type="button" className="btn" onClick={logout}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
