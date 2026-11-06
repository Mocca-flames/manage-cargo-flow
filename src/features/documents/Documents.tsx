import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { $api, client } from "../../api/client";
import { errorMessage } from "../../api/errors";
import { useAuth } from "../../auth/context/AuthContext";
import { can } from "../../auth/permissions";
import { getToken } from "../../auth/token";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { Field } from "../../components/Field";
import { useToast } from "../../components/toast";
import { fmtDate } from "../../lib/format";
import { DocReviewModal } from "../companies/DocReviewModal";
import "./documents.css";

const LIMIT = 50;
// Real values from the backend (documents router status pattern).
const STATUS_OPTIONS = ["pending", "approved", "rejected", "superseded"];

export function Documents() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const companyId = params.get("company_id") ?? "";
  const offset = Number(params.get("offset") ?? 0);
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: companiesData } = $api.useQuery("get", "/companies", {
    params: { query: { limit: 100 } },
  });

  const { data, error, isPending } = $api.useQuery("get", "/documents", {
    params: {
      query: {
        status: status || undefined,
        company_id: companyId ? Number(companyId) : undefined,
        limit: LIMIT,
        offset,
      },
    },
  });

  const [reviewDocId, setReviewDocId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const companyMap = new Map<number, { name: string; country?: string; reg?: string }>();
  if (companiesData) {
    for (const c of companiesData) {
      const name = c.trading_name ? `${c.trading_name} (${c.legal_name})` : c.legal_name;
      companyMap.set(c.id, { name, country: c.country_code, reg: c.registration_number });
    }
  }

  const companyOptions = (companiesData ?? []).slice().sort((a, b) => {
    const nameA = a.trading_name ?? a.legal_name;
    const nameB = b.trading_name ?? b.legal_name;
    return nameA.localeCompare(nameB);
  });

  const selectedCompany = companyId ? companiesData?.find((c) => c.id === Number(companyId)) : null;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "offset") next.delete("offset");
    setParams(next);
  }

  async function onDownload(docId: number, filename: string) {
    setDownloading(docId);
    try {
      // Download needs the Authorization header, so go through the API client
      // (a plain <a href> cannot send it) and save the blob locally.
      const { data: blob, error: dlError } = await client.GET("/documents/{doc_id}/download", {
        params: { path: { doc_id: docId } },
        parseAs: "blob",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      if (dlError || !(blob instanceof Blob)) throw dlError ?? new Error("Download failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.push(errorMessage(e), "error");
    } finally {
      setDownloading(null);
    }
  }

  function refresh() {
    void queryClient.invalidateQueries();
  }

  const rows = data ?? [];

  // Group rows by company_id
  const groups = new Map<number | null, typeof rows>();
  for (const doc of rows) {
    const cid = doc.company_id ?? null;
    const list = groups.get(cid) ?? [];
    list.push(doc);
    groups.set(cid, list);
  }

  return (
    <>
      <header className="page__header">
        <h1>Documents</h1>
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

      <div className="filters documents-filters">
        <Field label="Filter by Company" hint="Choose a company to isolate its documents.">
          {(id) => (
            <select
              id={id}
              value={companyId}
              onChange={(e) => update("company_id", e.target.value)}
            >
              <option value="">All companies</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.trading_name ? `${c.trading_name} (${c.legal_name})` : c.legal_name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {selectedCompany && (
        <div className="documents-active-company">
          <span>
            Filtering documents for{" "}
            <strong>{selectedCompany.trading_name ?? selectedCompany.legal_name}</strong>
          </span>
          <Link
            to={`/companies/${selectedCompany.id}/documents`}
            className="btn btn--sm btn--gold"
          >
            Open company documents &rarr;
          </Link>
        </div>
      )}

      {isPending && <p className="muted">Loading...</p>}
      {error && (
        <p className="error-text" role="alert">
          {errorMessage(error)}
        </p>
      )}
      {!isPending && !error && rows.length === 0 && (
        <p className="empty">No documents match this filter.</p>
      )}
      {!isPending &&
        !error &&
        Array.from(groups.entries()).map(([cid, docs]) => {
          const cInfo = cid ? companyMap.get(cid) : null;
          const companyName = cInfo ? cInfo.name : cid ? "Company" : "Unassigned";

          return (
            <section className="company-doc-group" key={cid ?? "unassigned"}>
              <header className="company-doc-group__header">
                <div className="stack" style={{ gap: "2px" }}>
                  {cid ? (
                    <Link to={`/companies/${cid}`} className="company-doc-group__title">
                      {companyName}
                    </Link>
                  ) : (
                    <span className="company-doc-group__title">{companyName}</span>
                  )}
                  {cInfo && (
                    <span className="company-doc-group__meta">
                      {cInfo.reg ? `${cInfo.reg} · ` : ""}{cInfo.country}
                    </span>
                  )}
                </div>
                {cid && (
                  <Link
                    to={`/companies/${cid}/documents`}
                    className="btn btn--sm btn--ghost"
                  >
                    View company docs ({docs.length}) &rarr;
                  </Link>
                )}
              </header>

              <div className="company-doc-group__list">
                {docs.map((d) => (
                  <article className="rec" key={d.id}>
                    <div className="rec__row">
                      <span className="rec__title">{d.custom_label ?? d.original_filename}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="rec__meta">
                      {d.original_filename} · Expiry {fmtDate(d.expiry_date)} · Uploaded {fmtDate(d.created_at)}
                    </div>
                    <div className="rec__actions">
                      <button
                        className="btn btn--sm"
                        disabled={downloading === d.id}
                        onClick={() => void onDownload(d.id, d.original_filename)}
                      >
                        {downloading === d.id ? "..." : "Download"}
                      </button>
                      {can.reviewDocuments(user?.staff_role) && d.status === "pending" && (
                        <button
                          className="btn btn--sm btn--primary"
                          onClick={() => setReviewDocId(d.id)}
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      {!isPending && !error && rows.length > 0 && (
        <Pagination
          offset={offset}
          limit={LIMIT}
          count={rows.length}
          onChange={(o) => update("offset", String(o))}
        />
      )}

      <DocReviewModal docId={reviewDocId} onClose={() => setReviewDocId(null)} onDone={refresh} />
    </>
  );
}
