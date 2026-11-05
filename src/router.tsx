import { createBrowserRouter, Outlet } from "react-router";
import { AuthProvider } from "./auth/context/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Login } from "./features/auth/Login";
import { ChangePassword } from "./features/auth/ChangePassword";
import { AppShell } from "./components/AppShell";
import { Home } from "./features/home/Home";
import { Companies } from "./features/companies/Companies";
import { CompanyDetail } from "./features/companies/CompanyDetail";
import { Documents } from "./features/documents/Documents";
import { Interests } from "./features/interests/Interests";
import { Users } from "./features/users/Users";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

export const router = createBrowserRouter([
  {
    element: (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </QueryClientProvider>
    ),
    children: [
      { path: "/login", element: <Login /> },
      { path: "/change-password", element: <ChangePassword /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Home /> },
              { path: "/companies", element: <Companies /> },
              { path: "/companies/:id", element: <CompanyDetail /> },
              { path: "/documents", element: <Documents /> },
              { path: "/interests", element: <Interests /> },
              { path: "/users", element: <Users /> },
            ],
          },
        ],
      },
    ],
  },
]);
