import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { $api } from "../../api/client";
import { errorMessage } from "../../api/errors";
import { useAuth } from "../../auth/context/AuthContext";
import { can } from "../../auth/permissions";
import { Modal } from "../../components/Modal";
import { Field } from "../../components/Field";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/toast";
import { fmtDate } from "../../lib/format";
import { DocReviewModal } from "./DocReviewModal";
import { DocViewerModal, type ViewingDoc } from "./DocViewerModal";
import "./companies.css";

const DOC_STATUS_OPTIONS = ["pending", "approved", "rejected", "superseded"];

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

  const location = useLocation();
  const isDocsSubpage = location.pathname.endsWith("/documents");
  const [docStatusFilter, setDocStatusFilter] = useState("");

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reviewDocId, setReviewDocId] = useState<number | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ViewingDoc | null>(null);

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

  if (isPending) return <p className="muted">Loading...</p>;
  if (error || !company)
    return (
      <p className="error-text" role="alert">
        {errorMessage(error)}
      </p>
    );

  const reasonOk = reason.trim().length >= 3 && reason.trim().length <= 1000;

  const filteredDocs = docStatusFilter
    ? company.documents.filter((d) => d.status === docStatusFilter)
    : company.documents;

  const pendingDocsCount = company.documents.filter((d) => d.status === "pending").length;
  const approvedDocsCount = company.documents.filter((d) => d.status === "approved").length;
  const rejectedDocsCount = company.documents.filter((d) => d.status === "rejected").length;

  return (
    <>
      <header className="page__header">
        <div className="stack">
          <Link to="/companies">&larr; Companies</Link>
          <h1>
            {isDocsSubpage ? "Documents · " : ""}
            {company.trading_name ?? company.legal_name}
          </h1>
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

      <nav className="company-tabs" aria-label="Company sub-navigation">
        <Link
          to={`/companies/${companyId}`}
          className={`company-tab ${!isDocsSubpage ? "is-active" : ""}`}
        >
          Overview
        </Link>
        <Link
          to={`/companies/${companyId}/documents`}
          className={`company-tab ${isDocsSubpage ? "is-active" : ""}`}
        >
          Documents ({company.documents.length})
          {company.missing_documents.length > 0 && (
            <span className="badge badge--warn" title={`${company.missing_documents.length} missing`}>
              {company.missing_documents.length} missing
            </span>
          )}
        </Link>
      </nav>

      {!isDocsSubpage ? (
        <>
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
            <div className="rec__row">
              <h2>Documents ({company.documents.length})</h2>
              <Link to={`/companies/${companyId}/documents`} className="btn btn--sm btn--primary">
                Open documents &rarr;
              </Link>
            </div>
            <div className="company-docs-summary-row">
              <span className="badge badge--warn">{pendingDocsCount} pending</span>
              <span className="badge badge--ok">{approvedDocsCount} approved</span>
              {rejectedDocsCount > 0 && <span className="badge badge--danger">{rejectedDocsCount} rejected</span>}
            </div>
            {company.missing_documents.length > 0 ? (
              <div>
                <p className="muted" style={{ marginBottom: "var(--space-2)" }}>
                  Missing required documents ({company.missing_documents.length}):
                </p>
                <div className="tags">
                  {company.missing_documents.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted">All required compliance documents are uploaded.</p>
            )}
            <div>
              <Link
                to={`/companies/${companyId}/documents`}
                className="btn btn--sm"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Manage & review documents &rarr;
              </Link>
            </div>
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
        </>
      ) : (
        <>
          <section className="card">
            <h2>Compliance documents status</h2>
            {company.missing_documents.length === 0 ? (
              <p className="muted">All required compliance documents are uploaded.</p>
            ) : (
              <>
                <p className="muted">
                  The following required documents have not been uploaded yet:
                </p>
                <div className="tags">
                  {company.missing_documents.map((m) => (
                    <span key={m} style={{ borderColor: "var(--warn)", color: "var(--warn)" }}>
                      {m}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          <div className="chips" role="group" aria-label="Filter documents by status">
            <button
              type="button"
              className={docStatusFilter === "" ? "on" : ""}
              onClick={() => setDocStatusFilter("")}
            >
              All ({company.documents.length})
            </button>
            {DOC_STATUS_OPTIONS.map((s) => {
              const count = company.documents.filter((d) => d.status === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  className={docStatusFilter === s ? "on" : ""}
                  onClick={() => setDocStatusFilter(s)}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>

          {filteredDocs.length === 0 ? (
            <p className="empty">No documents match this status.</p>
          ) : (
            filteredDocs.map((d) => (
              <article
                className="rec rec--interactive"
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => setViewingDoc(d)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setViewingDoc(d);
                  }
                }}
                aria-label={`View document ${d.custom_label ?? d.type_name ?? d.original_filename}`}
              >
                <div className="rec__row">
                  <span className="rec__title">{d.type_name ?? d.custom_label ?? d.original_filename}</span>
                  <StatusBadge status={d.status} />
                </div>
                <div className="rec__meta">
                  {d.original_filename} · Expiry {fmtDate(d.expiry_date)} · Tap card to view
                </div>
                <div className="rec__actions">
                  <button
                    type="button"
                    className="btn btn--sm btn--primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingDoc(d);
                    }}
                  >
                    View PDF
                  </button>
                  {can.reviewDocuments(user?.staff_role) && d.status === "pending" && (
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewDocId(d.id);
                      }}
                    >
                      Review
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </>
      )}

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

      <DocViewerModal
        doc={viewingDoc}
        onClose={() => setViewingDoc(null)}
        onDone={() => refresh("Document reviewed")}
        canReview={can.reviewDocuments(user?.staff_role)}
      />
    </>
  );
}
