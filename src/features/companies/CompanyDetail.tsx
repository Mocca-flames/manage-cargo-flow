import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { $api, client } from "../../api/client";
import { errorMessage } from "../../api/errors";
import { useAuth } from "../../auth/context/AuthContext";
import { can } from "../../auth/permissions";
import { Modal } from "../../components/Modal";
import { Field } from "../../components/Field";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/toast";
import { fmtDate } from "../../lib/format";
import { getToken } from "../../auth/token";
import { DocReviewModal } from "./DocReviewModal";
import "./companies.css";

type CompanyDoc = {
  id: number;
  type_name: string | null;
  custom_label: string | null;
  original_filename: string;
  status: string;
  expiry_date: string | null;
};

export function CompanyDetail() {
  const { id } = useParams();
  const companyId = Number(id);
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: company, error, isPending } = $api.useQuery("get", "/companies/{company_id}", {
    params: { path: { company_id: companyId } },
  });
  const verify = $api.useMutation("post", "/companies/{company_id}/verify");
  const reject = $api.useMutation("post", "/companies/{company_id}/reject");

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reviewDocId, setReviewDocId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  function closeReject() {
    setRejecting(false);
    setReason("");
  }

  function refresh(message: string) {
    toast.push(message);
    void queryClient.invalidateQueries();
  }

  function onVerify() {
    verify.mutate(
      { params: { path: { company_id: companyId } } },
      {
        onSuccess: () => refresh("Company verified"),
        onError: (e) => toast.push(errorMessage(e), "error"),
      },
    );
  }

  function onReject() {
    reject.mutate(
      { params: { path: { company_id: companyId } }, body: { reason: reason.trim() } },
      {
        onSuccess: () => {
          closeReject();
          refresh("Company rejected");
        },
        onError: (e) => toast.push(errorMessage(e), "error"),
      },
    );
  }

  async function onDownload(docId: number, filename: string) {
    setDownloading(docId);
    try {
      // Download needs the Authorization header, so go through the API client
      // (a plain <a href> cannot send it) and save the blob locally.
      const { data, error: dlError } = await client.GET("/documents/{doc_id}/download", {
        params: { path: { doc_id: docId } },
        parseAs: "blob",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      if (data instanceof Blob) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw dlError ?? new Error("Download failed");
      }
    } catch (e) {
      toast.push(errorMessage(e), "error");
    } finally {
      setDownloading(null);
    }
  }

  if (isPending) return <p className="muted">Loading...</p>;
  if (error || !company)
    return (
      <p className="error-text" role="alert">
        {errorMessage(error)}
      </p>
    );

  const reasonOk = reason.trim().length >= 3 && reason.trim().length <= 1000;

  return (
    <>
      <header className="page__header">
        <div className="stack">
          <Link to="/companies">&larr; Companies</Link>
          <h1>{company.trading_name ?? company.legal_name}</h1>
        </div>
        <div className="cluster">
          <StatusBadge status={company.status} />
          {can.reviewCompanies(user?.staff_role) &&
            (company.status === "unverified" || company.status === "rejected") && (
              <button
                className="btn btn--primary"
                disabled={verify.isPending}
                onClick={onVerify}
              >
                Verify
              </button>
            )}
          {can.reviewCompanies(user?.staff_role) &&
            (company.status === "unverified" || company.status === "verified") && (
              <button className="btn btn--danger" onClick={() => setRejecting(true)}>
                Reject
              </button>
            )}
        </div>
      </header>

      <section className="card">
        <h2>Details</h2>
        <dl className="kv">
          <dt>Legal name</dt>
          <dd>{company.legal_name}</dd>
          <dt>Reg. number</dt>
          <dd>{company.registration_number}</dd>
          <dt>Country</dt>
          <dd>{company.country_code}</dd>
          <dt>Tax number</dt>
          <dd>{company.tax_number ?? "-"}</dd>
          <dt>VAT number</dt>
          <dd>{company.vat_number ?? "-"}</dd>
          <dt>Email</dt>
          <dd>{company.email ?? "-"}</dd>
          <dt>Phone</dt>
          <dd>{company.phone ?? "-"}</dd>
          <dt>Address</dt>
          <dd>{company.address ?? "-"}</dd>
          <dt>City</dt>
          <dd>{company.city ?? "-"}</dd>
          <dt>Roles</dt>
          <dd>{company.roles.join(", ")}</dd>
          <dt>Operating countries</dt>
          <dd>{company.operating_countries?.join(", ") ?? "-"}</dd>
          <dt>Corridors</dt>
          <dd>{company.corridors?.join(", ") ?? "-"}</dd>
          <dt>Created</dt>
          <dd>{fmtDate(company.created_at)}</dd>
          {company.verified_at && (
            <>
              <dt>Verified</dt>
              <dd>{fmtDate(company.verified_at)}</dd>
            </>
          )}
          {company.rejection_reason && (
            <>
              <dt>Rejection reason</dt>
              <dd>{company.rejection_reason}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="card">
        <h2>Missing documents</h2>
        {company.missing_documents.length === 0 ? (
          <p className="muted">None.</p>
        ) : (
          <div className="tags">
            {company.missing_documents.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Documents</h2>
        {company.documents.length === 0 ? (
          <p className="empty">No documents uploaded yet.</p>
        ) : (
          company.documents.map((d: CompanyDoc) => (
            <article className="rec" key={d.id}>
              <div className="rec__row">
                <span className="rec__title">{d.type_name ?? d.custom_label ?? d.original_filename}</span>
                <StatusBadge status={d.status} />
              </div>
              <div className="rec__meta">
                {d.original_filename} · Expiry {fmtDate(d.expiry_date)}
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
                  <button className="btn btn--sm btn--primary" onClick={() => setReviewDocId(d.id)}>
                    Review
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="card">
        <h2>Users</h2>
        {company.users.length === 0 ? (
          <p className="empty">No users on this company.</p>
        ) : (
          company.users.map((u) => (
            <dl className="kv" key={u.id}>
              <dt>{u.full_name}</dt>
              <dd>
                {u.email}
                {u.phone ? ` · ${u.phone}` : ""}
              </dd>
            </dl>
          ))
        )}
      </section>

      <Modal open={rejecting} title="Reject company" onClose={closeReject}>
        <Field label="Reason (3 to 1000 characters)" hint="This is stored and may be shown to the company.">
          {(fid) => (
            <textarea
              id={fid}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
            />
          )}
        </Field>
        <div className="modal__actions">
          <button className="btn" onClick={closeReject}>
            Cancel
          </button>
          <button
            className="btn btn--danger-solid"
            disabled={!reasonOk || reject.isPending}
            onClick={onReject}
          >
            Reject company
          </button>
        </div>
      </Modal>

      <DocReviewModal
        docId={reviewDocId}
        onClose={() => setReviewDocId(null)}
        onDone={() => refresh("Document reviewed")}
      />
    </>
  );
}
