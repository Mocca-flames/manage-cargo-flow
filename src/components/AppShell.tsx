import { NavLink, Outlet, useLocation } from "react-router";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LuHouse, LuTruck, LuBuilding2, LuHandshake, LuUsers } from "react-icons/lu";
import { useAuth } from "../auth/context/AuthContext";
import { useToast } from "./toast";

declare const __APP_VERSION__: string;

const ICONS: Record<string, ReactNode> = {
  home: <LuHouse />,
  loads: <LuTruck />,
  companies: <LuBuilding2 />,
  interests: <LuHandshake />,
  users: <LuUsers />,
};

// Short labels: one line, never clip on a 320px phone.
const TABS = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/loads", label: "Loads", icon: "loads" },
  { to: "/companies", label: "Cos.", icon: "companies" },
  { to: "/interests", label: "Leads", icon: "interests" },
  { to: "/users", label: "Users", icon: "users" },
];

function screenTitle(pathname: string): string {
  if (pathname.startsWith("/loads")) return "Loads";
  if (pathname.startsWith("/companies/") && pathname.endsWith("/documents")) return "Company Documents";
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
