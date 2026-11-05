import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../auth/context/AuthContext";
import { errorMessage } from "../../api/errors";

export function Login() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [step, setStep] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = location.state?.from?.pathname ?? "/";

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result === "otp") {
        setCode("");
        setStep("otp");
      } else {
        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(code.trim(), remember);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-screen">
      <form
        className="card auth-card"
        onSubmit={step === "password" ? onSubmitPassword : onSubmitOtp}
      >
        <div className="topbar__mark" aria-hidden="true">
          <img src="/logo.svg" alt="" />
        </div>
        <h1>Cargo Flow</h1>

        {step === "password" ? (
          <>
            <p className="muted">Sign in</p>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <div className="error-text" role="alert">{error}</div>}
            <button className="btn btn--primary" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Enter the 6-digit code sent to <b>{email}</b>.
            </p>
            <div className="field">
              <label htmlFor="code">Verification code</label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
              />
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Trust this device for 30 days
            </label>
            {error && <div className="error-text" role="alert">{error}</div>}
            <div className="cluster">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStep("password");
                  setError(null);
                }}
              >
                Back
              </button>
              <button
                className="btn btn--primary"
                disabled={loading || code.length !== 6}
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
