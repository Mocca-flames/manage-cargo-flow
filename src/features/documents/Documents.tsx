import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { $api, client } from "../../api/client";
import type { components } from "../../api/schema";
import { errorMessage } from "../../api/errors";
import { useAuth } from "../../auth/context/AuthContext";
import { can } from "../../auth/permissions";
import { getToken } from "../../auth/token";
import { DataTable, type Column } from "../../components/DataTable";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { Field } from "../../components/Field";
import { useToast } from "../../components/toast";
import { fmtDate } from "../../lib/format";
import { DocReviewModal } from "../companies/DocReviewModal";
import "./documents.css";

type Document = components["schemas"]["DocumentOut"];

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

  const columns: Column<Document>[] = [
    {
      header: "Document",
      cell: (d) => d.custom_label ?? d.original_filename,
    },
    {
      header: "Company",
      cell: (d) =>
        d.company_id ? <Link to={`/companies/${d.company_id}`}>#{d.company_id}</Link> : "-",
    },
    { header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
    { header: "Expiry", cell: (d) => fmtDate(d.expiry_date) },
    { header: "Uploaded", cell: (d) => fmtDate(d.created_at) },
    {
      header: "",
      cell: (d) => (
        <span className="cluster">
          <button
            className="btn btn--sm"
            disabled={downloading === d.id}
            onClick={() => void onDownload(d.id, d.original_filename)}
          >
            {downloading === d.id ? "..." : "Download"}
          </button>
          {can.reviewDocuments(user?.staff_role) && d.status === "pending" && (
            <button className="btn btn--sm btn--primary" onClick={() => setReviewDocId(d.id)}>
              Review
            </button>
          )}
        </span>
      ),
    },
  ];

  const rows = data ?? [];

  return (
    <>
      <header className="page__header">
        <h1>Documents</h1>
      </header>

      <div className="filters documents-filters">
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
        <Field label="Company ID" hint="Leave empty for all companies.">
          {(id) => (
            <input
              id={id}
              type="number"
              min={1}
              value={companyId}
              onChange={(e) => update("company_id", e.target.value)}
            />
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
              rowKey={(d) => d.id}
              empty="No documents match this filter."
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

      <DocReviewModal docId={reviewDocId} onClose={() => setReviewDocId(null)} onDone={refresh} />
    </>
  );
}
