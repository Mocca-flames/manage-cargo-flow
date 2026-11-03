import { NavLink, Outlet } from "react-router";
import { useAuth } from "../auth/context/AuthContext";

declare const __APP_VERSION__: string;

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">Freight Ops</div>
        <div className="topbar__spacer" />
        <div className="topbar__user">{user?.full_name} ({user?.staff_role})</div>
        <button className="btn btn--ghost btn--sm" onClick={logout}>Logout</button>
      </header>
      <nav className="nav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/companies">Companies</NavLink>
        <NavLink to="/documents">Documents</NavLink>
        <NavLink to="/interests">Load Interests</NavLink>
        <NavLink to="/users">Users</NavLink>
      </nav>
      <main className="page">
        <Outlet />
      </main>
      <footer className="footer">Build {__APP_VERSION__}</footer>
    </div>
  );
}
