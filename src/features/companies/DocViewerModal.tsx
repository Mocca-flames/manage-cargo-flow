import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { $api, client } from "../../api/client";
import { errorMessage } from "../../api/errors";
import { getToken } from "../../auth/token";
import { Field } from "../../components/Field";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/toast";

export interface ViewingDoc {
  id: number;
  original_filename: string;
  custom_label: string | null;
  type_name?: string | null;
  status: string;
}

interface Props {
  doc: ViewingDoc | null;
  onClose: () => void;
  onDone?: () => void;
  canReview?: boolean;
}

export function DocViewerModal({ doc, onClose, onDone, canReview }: Props) {
  if (!doc) return null;
  return (
    <DocViewerFullscreen
      doc={doc}
      onClose={onClose}
      onDone={onDone}
      canReview={canReview}
    />
  );
}

function DocViewerFullscreen({
  doc,
  onClose,
  onDone,
  canReview,
}: {
  doc: ViewingDoc;
  onClose: () => void;
  onDone?: () => void;
  canReview?: boolean;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const review = $api.useMutation("post", "/documents/{doc_id}/review");

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick overlay action: null | "approve" | "reject"
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [expiry, setExpiry] = useState("");

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    async function loadDoc() {
      try {
        const { data, error: fetchErr } = await client.GET("/documents/{doc_id}/download", {
          params: { path: { doc_id: doc.id }, query: { inline: true } },
          parseAs: "blob",
          headers: { Authorization: `Bearer ${getToken() ?? ""}` },
        });

        if (!active) return;
        if (data instanceof Blob) {
          url = URL.createObjectURL(data);
          setBlobUrl(url);
          setMimeType(data.type || "application/pdf");
        } else {
          throw fetchErr ?? new Error("Could not load document preview");
        }
      } catch (err) {
        if (!active) return;
        setError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDoc();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (reviewAction) setReviewAction(null);
        else onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      active = false;
      window.removeEventListener("keydown", handleKeyDown);
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.id, reviewAction, onClose]);

  const title = doc.type_name ?? doc.custom_label ?? doc.original_filename;
  const isImage = mimeType.startsWith("image/");
  const noteOk = reviewAction !== "reject" || note.trim().length > 0;

  function submitReview() {
    if (!reviewAction || !noteOk) return;
    const decision = reviewAction === "approve" ? "approved" : "rejected";
    review.mutate(
      {
        params: { path: { doc_id: doc.id } },
        body: {
          decision,
          note: note.trim() || null,
          expiry_date: decision === "approved" && expiry ? expiry : null,
        },
      },
      {
        onSuccess: () => {
          toast.push(decision === "approved" ? "Document approved" : "Document rejected");
          void queryClient.invalidateQueries();
          onClose();
          if (onDone) onDone();
        },
        onError: (err) => toast.push(errorMessage(err), "error"),
      },
    );
  }

  return (
    <div className="fullscreen-viewer" role="dialog" aria-modal="true" aria-label={title}>
      <header className="fullscreen-viewer__topbar">
        <div className="fullscreen-viewer__heading">
          <button
            type="button"
            className="fullscreen-viewer__btn-back"
            onClick={onClose}
            aria-label="Close document viewer"
          >
            &larr; Back
          </button>
          <div className="fullscreen-viewer__titles">
            <span className="fullscreen-viewer__title">{title}</span>
            <span className="fullscreen-viewer__meta">{doc.original_filename}</span>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        <div className="fullscreen-viewer__actions">
          {blobUrl && (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              style={{ color: "var(--color-canvas)", padding: "6px 10px" }}
              onClick={() => window.open(blobUrl, "_blank")}
              title="Open full page in browser tab without saving"
            >
              Open in tab
            </button>
          )}

          {canReview && doc.status === "pending" && (
            <>
              <button
                type="button"
                className="fullscreen-viewer__btn-approve"
                onClick={() => {
                  setReviewAction("approve");
                  setNote("");
                  setExpiry("");
                }}
              >
                Approve
              </button>
              <button
                type="button"
                className="fullscreen-viewer__btn-reject"
                onClick={() => {
                  setReviewAction("reject");
                  setNote("");
                  setExpiry("");
                }}
              >
                Reject
              </button>
            </>
          )}

          <button
            type="button"
            className="fullscreen-viewer__close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      </header>

      <main className="fullscreen-viewer__body">
        {loading && (
          <div className="fullscreen-viewer__loading">
            <p>Loading document preview in full screen...</p>
          </div>
        )}

        {error && (
          <div className="fullscreen-viewer__error" role="alert">
            <p className="error-text">{error}</p>
          </div>
        )}

        {!loading && !error && blobUrl && (
          isImage ? (
            <img src={blobUrl} alt={doc.original_filename} className="fullscreen-viewer__img" />
          ) : (
            <iframe
              src={blobUrl}
              className="fullscreen-viewer__frame"
              title={doc.original_filename}
            />
          )
        )}

        {reviewAction && (
          <div className="fullscreen-viewer__drawer" role="region" aria-label="Review document overlay">
            <div className="fullscreen-viewer__drawer-head">
              <h3>{reviewAction === "approve" ? "Approve document" : "Reject document"}</h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setReviewAction(null)}
                aria-label="Cancel"
              >
                &times;
              </button>
            </div>

            {reviewAction === "approve" && (
              <Field label="Expiry date (optional)" hint="Required by server for certain document types.">
                {(fid) => (
                  <input
                    id={fid}
                    type="date"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                )}
              </Field>
            )}

            <Field label={reviewAction === "reject" ? "Reason for rejection *" : "Note (optional)"}>
              {(fid) => (
                <textarea
                  id={fid}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    reviewAction === "reject"
                      ? "Explain why this document is rejected..."
                      : "Optional note for records..."
                  }
                  maxLength={1000}
                />
              )}
            </Field>

            <div className="fullscreen-viewer__drawer-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setReviewAction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={reviewAction === "approve" ? "btn btn--ok" : "btn btn--danger-solid"}
                disabled={review.isPending || !noteOk}
                onClick={submitReview}
              >
                {review.isPending
                  ? "Saving..."
                  : reviewAction === "approve"
                  ? "Confirm Approval"
                  : "Confirm Rejection"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
