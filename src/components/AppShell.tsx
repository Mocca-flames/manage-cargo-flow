import { NavLink, Outlet, useLocation } from "react-router";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/context/AuthContext";
import { useToast } from "./toast";

declare const __APP_VERSION__: string;

const ICONS: Record<string, ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M9 21v-7h6v7" />
    </svg>
  ),
  companies: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M15 21V9h4a2 2 0 0 1 2 2v10" />
      <path d="M9 7h2M9 11h2M9 15h2M17 13h1M17 17h1" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  ),
  interests: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
      <path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M9 18h6" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

// Short labels: one line, never clip on a 320px phone.
const TABS = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/companies", label: "Cos.", icon: "companies" },
  { to: "/documents", label: "Docs", icon: "documents" },
  { to: "/interests", label: "Leads", icon: "interests" },
  { to: "/users", label: "Users", icon: "users" },
];

function screenTitle(pathname: string): string {
  if (pathname.startsWith("/companies/")) return "Company";
  if (pathname.startsWith("/companies")) return "Companies";
  if (pathname.startsWith("/documents")) return "Documents";
  if (pathname.startsWith("/interests")) return "Load interests";
  if (pathname.startsWith("/users")) return "Users";
  if (pathname.startsWith("/change-password")) return "Change password";
  return "Cargo Flow";
}

export function AppShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const firstName = user?.full_name?.split(" ")[0];

  async function refresh() {
    if (!navigator.onLine) {
      toast.push("You are offline — cannot refresh.", "error");
      return;
    }
    await queryClient.invalidateQueries();
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) void registration.update();
    toast.push("Refreshed — data checked for updates.");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__mark" aria-hidden="true">
          <img src="/logo.svg" alt="" />
        </div>
        <div className="topbar__brand">
          <b>{screenTitle(pathname)}</b>
          <small>
            <i aria-hidden="true" />
            <span className="topbar__user-text">
              {firstName}
              {user?.staff_role ? ` · ${user.staff_role}` : ""}
            </span>
          </small>
        </div>
        <div className="topbar__spacer" />
        <div className="topbar__actions">
          <button
            className="topbar__logout"
            onClick={() => void refresh()}
            aria-label="Refresh data and check for app updates"
          >
            Refresh
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
        <footer className="footer">Build {__APP_VERSION__}</footer>
      </main>
      <nav className="tabs" aria-label="Main navigation">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            {ICONS[t.icon]}
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
