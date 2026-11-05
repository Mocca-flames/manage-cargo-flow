import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { $api } from "../../api/client";
import type { components } from "../../api/schema";
import { errorMessage } from "../../api/errors";
import { useAuth } from "../../auth/context/AuthContext";
import { can } from "../../auth/permissions";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/toast";
import { fmtDate } from "../../lib/format";
import "./interests.css";

type Interest = components["schemas"]["InterestOut"];
type InterestUpdate = components["schemas"]["InterestUpdate"];
type ConvertLeadIn = components["schemas"]["ConvertLeadIn"];

const LIMIT = 50;
// Real values from the backend (load_interests router status pattern).
const STATUS_OPTIONS = ["new", "contacted", "onboarded", "dismissed"];

export function Interests() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const loadId = params.get("load_id") ?? "";
  const offset = Number(params.get("offset") ?? 0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, error, isPending } = $api.useQuery("get", "/load-interests", {
    params: {
      query: {
        status: status || undefined,
        load_id: loadId ? Number(loadId) : undefined,
        limit: LIMIT,
        offset,
      },
    },
  });

  const [editing, setEditing] = useState<Interest | null>(null);
  const [converting, setConverting] = useState<Interest | null>(null);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "offset") next.delete("offset");
    setParams(next);
  }

  function refresh() {
    void queryClient.invalidateQueries();
  }

  const rows = data ?? [];

  return (
    <>
      <header className="page__header">
        <h1>Load interests</h1>
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

      <div className="filters interests-filters">
        <Field label="Load ID" hint="Empty = all loads.">
          {(id) => (
            <input
              id={id}
              type="number"
              min={1}
              value={loadId}
              onChange={(e) => update("load_id", e.target.value)}
            />
          )}
        </Field>
      </div>

      {isPending && <p className="muted">Loading...</p>}
      {error && (
        <p className="error-text" role="alert">
          {errorMessage(error)}
        </p>
      )}
      {!isPending && !error && rows.length === 0 && (
        <p className="empty">No interests match this filter.</p>
      )}
      {!isPending &&
        !error &&
        rows.map((i) => (
          <article className="rec" key={i.id}>
            <div className="rec__row">
              <span className="rec__title">{i.full_name}</span>
              <StatusBadge status={i.status} />
            </div>
            <div className="rec__meta">{i.phone}</div>
            <div className="rec__route">
              <span>#{i.load_id} {i.load_origin}</span>
              <span>{i.load_destination}</span>
            </div>
            <div className="rec__meta">
              {i.truck_type ?? "Any truck"} · {fmtDate(i.created_at)}
            </div>
            {i.note && <div className="rec__note">{i.note}</div>}
            {can.handleInterests(user?.staff_role) && (
              <div className="rec__actions">
                <button className="btn btn--sm" onClick={() => setEditing(i)}>
                  Update
                </button>
                {i.status !== "onboarded" && i.company_id === null && (
                  <button className="btn btn--sm btn--primary" onClick={() => setConverting(i)}>
                    Convert
                  </button>
                )}
              </div>
            )}
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

      <UpdateInterestModal
        interest={editing}
        onClose={() => setEditing(null)}
        onDone={refresh}
      />
      <ConvertLeadModal
        interest={converting}
        onClose={() => setConverting(null)}
        onDone={refresh}
      />
    </>
  );
}

interface ModalProps {
  interest: Interest | null;
  onClose: () => void;
  onDone: () => void;
}

function UpdateInterestModal({ interest, onClose, onDone }: ModalProps) {
  const toast = useToast();
  const update = $api.useMutation("patch", "/load-interests/{interest_id}");
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");

  // Reset local form state each time a row is opened (and when closed).
  const [lastId, setLastId] = useState<number | null>(null);
  if (interest && interest.id !== lastId) {
    setLastId(interest.id);
    setStatus(interest.status);
    setNote(interest.note ?? "");
  }
  if (!interest && lastId !== null) setLastId(null);

  function submit() {
    if (!interest) return;
    const body: InterestUpdate = {};
    if (status !== interest.status) body.status = status;
    const trimmed = note.trim();
    if (trimmed !== (interest.note ?? "")) body.note = trimmed || null;
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { params: { path: { interest_id: interest.id } }, body },
      {
        onSuccess: () => {
          toast.push("Interest updated");
          onDone();
          onClose();
        },
        onError: (e) => toast.push(errorMessage(e), "error"),
      },
    );
  }

  return (
    <Modal open={interest !== null} title="Update interest" onClose={onClose}>
      <Field label="Status">
        {(id) => (
          <select id={id} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Note (optional)" hint="Max 1000 · staff only">
        {(id) => (
          <textarea
            id={id}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
        )}
      </Field>
      <div className="modal__actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn--primary" disabled={update.isPending} onClick={submit}>
          {update.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function ConvertLeadModal({ interest, onClose, onDone }: ModalProps) {
  const toast = useToast();
  const convert = $api.useMutation("post", "/load-interests/{interest_id}/convert");

  // Company (CompanyIn)
  const [legalName, setLegalName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  // Roles + profiles
  const [isTransporter, setIsTransporter] = useState(true);
  const [isBroker, setIsBroker] = useState(false);
  const [operatingCountries, setOperatingCountries] = useState("");
  const [corridors, setCorridors] = useState("");
  const [findsTrucks, setFindsTrucks] = useState(true);
  // Owner
  const [createOwner, setCreateOwner] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");

  const [lastId, setLastId] = useState<number | null>(null);
  if (interest && interest.id !== lastId) {
    setLastId(interest.id);
    setLegalName("");
    setTradingName("");
    setRegNo("");
    setCountryCode("");
    setPhone("");
    setIsTransporter(true);
    setIsBroker(false);
    setOperatingCountries("");
    setCorridors("");
    setFindsTrucks(true);
    setCreateOwner(false);
    setOwnerEmail("");
  }
  if (!interest && lastId !== null) setLastId(null);

  const roles: ConvertLeadIn["roles"] = [];
  if (isTransporter) roles.push("transporter");
  if (isBroker) roles.push("broker");

  const list = (s: string) =>
    [...new Set(
      s
        .split(/[,\n]/)
        .map((x) => x.trim())
        .filter(Boolean),
    )];

  const valid =
    legalName.trim() !== "" &&
    regNo.trim() !== "" &&
    countryCode.trim().length === 2 &&
    roles.length >= 1 &&
    (!isTransporter || list(operatingCountries).length >= 1) &&
    (!isBroker || list(corridors).length >= 1) &&
    (!createOwner || ownerEmail.trim() !== "");

  function submit() {
    if (!interest || !valid) return;
    const body: ConvertLeadIn = {
      company: {
        legal_name: legalName.trim(),
        trading_name: tradingName.trim() || null,
        registration_number: regNo.trim(),
        country_code: countryCode.trim().toUpperCase(),
        phone: phone.trim() || null,
      },
      roles,
      transporter: isTransporter
        ? { operating_countries: [...new Set(list(operatingCountries).map((c) => c.toUpperCase()))] }
        : null,
      broker: isBroker
        ? { corridors: list(corridors), finds_trucks: findsTrucks }
        : null,
      create_owner: createOwner,
      owner_email: createOwner ? ownerEmail.trim() : null,
    };
    convert.mutate(
      { params: { path: { interest_id: interest.id } }, body },
      {
        onSuccess: (out) => {
          toast.push(out.message || "Lead converted");
          onDone();
          onClose();
        },
        onError: (e) => toast.push(errorMessage(e), "error"),
      },
    );
  }

  return (
    <Modal open={interest !== null} title="Convert lead to company" onClose={onClose}>
      <p className="muted">
        Creates a company from this lead. The server emails the owner if you choose to create one.
      </p>

      <Field label="Legal name *">
        {(id) => (
          <input id={id} value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
        )}
      </Field>
      <Field label="Trading name">
        {(id) => <input id={id} value={tradingName} onChange={(e) => setTradingName(e.target.value)} />}
      </Field>
      <Field label="Registration number *">
        {(id) => <input id={id} value={regNo} onChange={(e) => setRegNo(e.target.value)} required />}
      </Field>
      <Field label="Country code * (2 letters)" hint="e.g. ZA, BW, ZM">
        {(id) => (
          <input
            id={id}
            value={countryCode}
            maxLength={2}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            required
          />
        )}
      </Field>
      <Field label="Phone">
        {(id) => <input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
      </Field>

      <fieldset className="interests-convert__roles">
        <legend>Company roles * (pick at least one)</legend>
        <label>
          <input
            type="checkbox"
            checked={isTransporter}
            onChange={(e) => setIsTransporter(e.target.checked)}
          />{" "}
          Transporter
        </label>
        <label>
          <input type="checkbox" checked={isBroker} onChange={(e) => setIsBroker(e.target.checked)} />{" "}
          Broker
        </label>
      </fieldset>

      {isTransporter && (
        <Field
          label="Operating countries *"
          hint="Comma-separated 2-letter codes, e.g. ZA, BW, ZM"
        >
          {(id) => (
            <input
              id={id}
              value={operatingCountries}
              onChange={(e) => setOperatingCountries(e.target.value)}
              required
            />
          )}
        </Field>
      )}

      {isBroker && (
        <>
          <Field label="Corridors *" hint="Comma-separated, e.g. Lusaka–Johannesburg, Harare–Durban">
            {(id) => (
              <input
                id={id}
                value={corridors}
                onChange={(e) => setCorridors(e.target.value)}
                required
              />
            )}
          </Field>
          <label className="interests-convert__check">
            <input
              type="checkbox"
              checked={findsTrucks}
              onChange={(e) => setFindsTrucks(e.target.checked)}
            />{" "}
            Finds trucks for others
          </label>
        </>
      )}

      <label className="interests-convert__check">
        <input
          type="checkbox"
          checked={createOwner}
          onChange={(e) => setCreateOwner(e.target.checked)}
        />{" "}
        Create owner account (emails a temporary password)
      </label>
      {createOwner && (
        <Field label="Owner email *">
          {(id) => (
            <input
              id={id}
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
          )}
        </Field>
      )}

      <div className="modal__actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn--primary"
          disabled={!valid || convert.isPending}
          onClick={submit}
        >
          {convert.isPending ? "Converting..." : "Convert lead"}
        </button>
      </div>
    </Modal>
  );
}
