import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { $api } from "../../api/client";
import { errorMessage } from "../../api/errors";
import { useAuth } from "../../auth/context/AuthContext";
import { can } from "../../auth/permissions";
import { Field } from "../../components/Field";
import { useToast } from "../../components/toast";
import "./users.css";

const BASE_ROLES = ["user", "manager", "technician"];
const DIRECTOR_ROLES = ["admin", "director"];

export function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const create = $api.useMutation("post", "/users");

  const { data: companiesData } = $api.useQuery("get", "/companies", {
    params: { query: { limit: 100 } },
  });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("user");
  const [companyId, setCompanyId] = useState("");

  const companyOptions = (companiesData ?? []).slice().sort((a, b) => {
    const nameA = a.trading_name ?? a.legal_name;
    const nameB = b.trading_name ?? b.legal_name;
    return nameA.localeCompare(nameB);
  });

  // Only a director may create admin/director accounts (server enforces too).
  const privileged = can.createPrivilegedStaff(user?.staff_role);
  const roleOptions = privileged ? [...BASE_ROLES, ...DIRECTOR_ROLES] : BASE_ROLES;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        body: {
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          staff_role: role,
          company_id: companyId ? Number(companyId) : null,
        },
      },
      {
        onSuccess: () => {
          toast.push("User created. A temporary password was emailed.");
          void queryClient.invalidateQueries();
          setEmail("");
          setFullName("");
          setPhone("");
          setRole("user");
          setCompanyId("");
        },
        onError: (err) => toast.push(errorMessage(err), "error"),
      },
    );
  }

  return (
    <>
      <header className="page__header">
        <h1>Users</h1>
      </header>

      <section className="card users-form">
        <h2>Create user</h2>
        <p className="muted">
          Temporary password is emailed and must be changed at first login. Staff roles need an
          allowed company email domain; admin/director roles are director-only.
        </p>
        <form className="stack" onSubmit={onSubmit}>
          <Field label="Email *">
            {(id) => (
              <input
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            )}
          </Field>
          <Field label="Full name *">
            {(id) => (
              <input
                id={id}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
          </Field>
          <Field label="Phone">
            {(id) => <input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </Field>
          <Field label="Role *" hint={privileged ? undefined : "Only a director can assign admin or director."}>
            {(id) => (
              <select id={id} value={role} onChange={(e) => setRole(e.target.value)}>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Company" hint="Optional — select for company users, none for internal staff.">
            {(id) => (
              <select id={id} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">None (Internal staff)</option>
                {companyOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.trading_name ? `${c.trading_name} (${c.legal_name})` : c.legal_name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="cluster">
            <button className="btn btn--primary" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>User list</h2>
        <p className="muted">Coming soon — needs a <code>GET /users</code> endpoint.</p>
      </section>
    </>
  );
}
