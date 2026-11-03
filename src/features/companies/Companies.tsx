import { Link, useSearchParams } from "react-router";
import { $api } from "../../api/client";
import type { components } from "../../api/schema";
import { errorMessage } from "../../api/errors";
import { DataTable, type Column } from "../../components/DataTable";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { Field } from "../../components/Field";
import { fmtDate } from "../../lib/format";
import "./companies.css";

type Company = components["schemas"]["CompanyListItem"];

const LIMIT = 50;
// Real values from the backend (app/features/companies/models.py COMPANY_STATUSES).
const STATUS_OPTIONS = ["unverified", "verified", "rejected", "suspended"];

export function Companies() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const offset = Number(params.get("offset") ?? 0);

  const { data, error, isPending } = $api.useQuery("get", "/companies", {
    params: { query: { status: status || undefined, limit: LIMIT, offset } },
  });

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "offset") next.delete("offset"); // filter change -> back to page 1
    setParams(next);
  }

  const columns: Column<Company>[] = [
    { header: "Company", cell: (c) => <Link to={`/companies/${c.id}`}>{c.trading_name ?? c.legal_name}</Link> },
    { header: "Reg. no.", cell: (c) => c.registration_number },
    { header: "Country", cell: (c) => c.country_code },
    { header: "Roles", cell: (c) => c.roles.join(", ") },
    { header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    { header: "Created", cell: (c) => fmtDate(c.created_at) },
  ];

  const rows = data ?? [];

  return (
    <>
      <header className="page__header">
        <h1>Companies</h1>
      </header>

      <div className="filters companies-filters">
        <Field label="Status">
          {(id) => (
            <select id={id} value={status} onChange={(e) => update("status", e.target.value)}>
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <section className="card">
        {isPending && <p className="muted">Loading...</p>}
        {error && (
          <p className="error-text" role="alert">
            {errorMessage(error)}
          </p>
        )}
        {!isPending && !error && (
          <>
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(c) => c.id}
              empty="No companies match this filter."
            />
            <Pagination
              offset={offset}
              limit={LIMIT}
              count={rows.length}
              onChange={(o) => update("offset", String(o))}
            />
          </>
        )}
      </section>
    </>
  );
}
