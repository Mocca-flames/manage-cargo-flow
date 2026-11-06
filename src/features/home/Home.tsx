import { Link } from "react-router";
import { useAuth } from "../../auth/context/AuthContext";
import { SiteStats } from "./SiteStats";

declare const __APP_VERSION__: string;

const QUICK = [
  { to: "/loads", label: "Loads", hint: "Post & manage loads" },
  { to: "/companies", label: "Companies", hint: "Verify & compliance" },
  { to: "/companies", label: "Documents", hint: "Manage per company" },
  { to: "/interests", label: "Load interests", hint: "Handle new leads" },
  { to: "/users", label: "Users", hint: "Create staff accounts" },
];

export function Home() {
  const { user } = useAuth();

  return (
    <>
      <header className="page__header">
        <div className="stack">
          <h1>Hello, {user?.full_name?.split(" ")[0] ?? "there"}</h1>
          <p className="muted">{user?.staff_role} · Cargo Flow admin portal</p>
        </div>
      </header>

      <div className="quick">
        {QUICK.map((q) => (
          <Link className="card quick__tile" key={q.to} to={q.to}>
            <b>{q.label}</b>
            <span className="muted">{q.hint}</span>
          </Link>
        ))}
      </div>

      <SiteStats />

      <p className="muted centered">
        Build {__APP_VERSION__}
      </p>
    </>
  );
}
