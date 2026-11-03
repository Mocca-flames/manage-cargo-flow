import { useState } from "react";
import { $api } from "../../api/client";
import { errorMessage } from "../../api/errors";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  docId: number | null;
  onClose: () => void;
  onDone: () => void;
}

export function DocReviewModal({ docId, onClose, onDone }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const review = $api.useMutation("post", "/documents/{doc_id}/review");
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [note, setNote] = useState("");
  const [expiry, setExpiry] = useState("");

  // Reset the form each time a different document is opened (and when closed).
  const [lastId, setLastId] = useState<number | null>(null);
  if (docId !== lastId) {
    setLastId(docId);
    setDecision("approved");
    setNote("");
    setExpiry("");
  }

  function submit() {
    if (docId === null) return;
    review.mutate(
      {
        params: { path: { doc_id: docId } },
        body: {
          decision,
          note: note.trim() || null,
          expiry_date: decision === "approved" && expiry ? expiry : null,
        },
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries();
          onClose();
          onDone();
        },
        onError: (e) => toast.push(errorMessage(e), "error"),
      },
    );
  }

  return (
    <Modal open={docId !== null} title="Review document" onClose={onClose}>
      <Field label="Decision">
        {(id) => (
          <select
            id={id}
            value={decision}
            onChange={(e) => setDecision(e.target.value as "approved" | "rejected")}
          >
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
          </select>
        )}
      </Field>
      {decision === "approved" && (
        <Field label="Expiry date (optional)" hint="Required by the server for some document types.">
          {(id) => (
            <input id={id} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          )}
        </Field>
      )}
      <Field label="Note (optional)">
        {(id) => (
          <textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        )}
      </Field>
      <div className="modal__actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn--primary"
          disabled={review.isPending}
          onClick={submit}
        >
          {review.isPending ? "Saving..." : "Save decision"}
        </button>
      </div>
    </Modal>
  );
}
