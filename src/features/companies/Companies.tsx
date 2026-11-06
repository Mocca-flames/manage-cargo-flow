import { Link, useSearchParams } from "react-router";
import { $api } from "../../api/client";
import { errorMessage } from "../../api/errors";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { fmtDate } from "../../lib/format";
import "./companies.css";

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

  const rows = data ?? [];

  return (
    <>
      <header className="page__header">
        <h1>Companies</h1>
      </header>

      <div className="chips" role="group" aria-label="Filter by status">
        <button type="button" className={status === "" ? "on" : ""} onClick={() => update("status", "")}>
          All
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={status === s ? "on" : ""}
            onClick={() => update("status", s)}
          >
            {s}
          </button>
        ))}
      </div>

      {isPending && <p className="muted">Loading...</p>}
      {error && (
        <p className="error-text" role="alert">
          {errorMessage(error)}
        </p>
      )}
      {!isPending && !error && rows.length === 0 && (
        <p className="empty">No companies match this filter.</p>
      )}
      {!isPending &&
        !error &&
        rows.map((c) => (
          <article className="rec" key={c.id}>
            <div className="rec__row">
              <Link to={`/companies/${c.id}`} className="rec__title" style={{ textDecoration: "none" }}>
                {c.trading_name ?? c.legal_name}
              </Link>
              <StatusBadge status={c.status} />
            </div>
            <div className="rec__meta">
              {c.registration_number} · {c.country_code}
            </div>
            <div className="tags">
              {c.roles.map((r) => (
                <span key={r}>{r}</span>
              ))}
            </div>
            <div className="rec__meta">Created {fmtDate(c.created_at)}</div>
            <div className="rec__actions">
              <Link to={`/companies/${c.id}`} className="btn btn--sm">
                Overview
              </Link>
              <Link to={`/companies/${c.id}/documents`} className="btn btn--sm btn--primary">
                Documents &rarr;
              </Link>
            </div>
          </article>
        ))}
      {!isPending && !error && rows.length > 0 && (
        <Pagination
          offset={offset}
          limit={LIMIT}
          count={rows.length}
          onChange={(o) => update("offset", String(o))}
        />
      )}
    </>
  );
}
