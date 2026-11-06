import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { $api } from "../../api/client";
import type { components } from "../../api/schema";
import { errorMessage } from "../../api/errors";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/toast";
import { fmtDate } from "../../lib/format";
import "./loads.css";

type Load = components["schemas"]["LoadOut"];
type LoadCreate = components["schemas"]["LoadCreate"];
type LoadUpdate = components["schemas"]["LoadUpdate"];

const LIMIT = 50;
const STATUS_OPTIONS = ["open", "assigned", "closed"];
const TRUCK_TYPES = [
  "superlink",
  "flatbed",
  "tautliner",
  "tipper",
  "tanker",
  "refrigerated",
  "container",
  "side_tipper",
  "other",
];
const CURRENCIES = ["USD", "ZAR"];
const CUSTOM_TERMS = "__custom__";
const PAYMENT_TERMS = [
  { value: "70/30", label: "70/30" },
  { value: "60/40", label: "60/40" },
  { value: "50/50", label: "50/50" },
  { value: "30 days", label: "30 Days" },
  { value: "7 days", label: "7 Days" },
];

function termsValue(selectValue: string, customText: string): string | null {
  if (selectValue === CUSTOM_TERMS) return customText.trim() || null;
  return selectValue || null;
}

function matchTerms(existing: string | null): { select: string; custom: string } {
  if (!existing) return { select: "", custom: "" };
  const preset = PAYMENT_TERMS.find((t) => t.value === existing);
  if (preset) return { select: preset.value, custom: "" };
  return { select: CUSTOM_TERMS, custom: existing };
}

function money(rate: string, currency: string) {
  const n = Number(rate);
  const symbol = currency === "ZAR" ? "R" : "$";
  return `${symbol}${n.toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`;
}

function termsLabel(t: string | null) {
  if (!t) return null;
  return t.replace(/_/g, " ");
}

export function Loads() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const origin = params.get("origin") ?? "";
  const destination = params.get("destination") ?? "";
  const truckType = params.get("truck_type") ?? "";
  const offset = Number(params.get("offset") ?? 0);
  const queryClient = useQueryClient();

  const { data, error, isPending } = $api.useQuery("get", "/loads", {
    params: {
      query: {
        status: status || undefined,
        origin: origin || undefined,
        destination: destination || undefined,
        truck_type: truckType || undefined,
        limit: LIMIT,
        offset,
      },
    },
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Load | null>(null);

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
        <h1>Loads</h1>
        <button type="button" className="btn btn--gold btn--sm" onClick={() => setCreating(true)}>
          + Post a load
        </button>
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

      <div className="filters loads-filters">
        <Field label="Origin">
          {(id) => (
            <input
              id={id}
              type="search"
              value={origin}
              placeholder="e.g. Durban"
              onChange={(e) => update("origin", e.target.value)}
            />
          )}
        </Field>
        <Field label="Destination">
          {(id) => (
            <input
              id={id}
              type="search"
              value={destination}
              placeholder="e.g. Lusaka"
              onChange={(e) => update("destination", e.target.value)}
            />
          )}
        </Field>
        <Field label="Truck type">
          {(id) => (
            <select id={id} value={truckType} onChange={(e) => update("truck_type", e.target.value)}>
              <option value="">Any</option>
              {TRUCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
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
        <p className="empty">No loads match this filter. Tap "Post a load" to add one.</p>
      )}
      {!isPending &&
        !error &&
        rows.map((l) => (
          <article className="rec" key={l.id}>
            <div className="rec__row">
              <span className="rec__title">#{l.id}</span>
              <StatusBadge status={l.status} />
            </div>
            <div className="rec__route">
              <span>{l.origin}</span>
              <span>{l.destination}</span>
            </div>
            <div className="rec__row">
              <span className="rec__meta">{l.commodity}</span>
              <span className="loads__rate">
                {money(l.rate, l.currency)}
                <small className="muted"> /truck</small>
              </span>
            </div>
            <div className="tags">
              <span>
                {l.trucks_needed} truck{l.trucks_needed === 1 ? "" : "s"} needed
              </span>
              {l.truck_type && <span>{l.truck_type.replace(/_/g, " ")}</span>}
              {termsLabel(l.payment_terms) && <span>Pay: {termsLabel(l.payment_terms)}</span>}
              {l.pickup_date && <span>Pickup {fmtDate(l.pickup_date)}</span>}
            </div>
            {l.has_backload && (
              <div className="loads__backload">
                <span className="loads__backload-label">Backload</span>
                <div className="rec__route rec__route--sm">
                  <span>{l.backload_origin}</span>
                  <span>{l.backload_destination}</span>
                </div>
                <div className="rec__meta">
                  {l.backload_commodity ?? "Any commodity"}
                  {l.backload_rate && ` · ${money(l.backload_rate, l.currency)}`}
                </div>
              </div>
            )}
            {l.note && <div className="rec__note">{l.note}</div>}
            <div className="rec__meta">Posted {fmtDate(l.created_at)}</div>
            <div className="rec__actions">
              <button className="btn btn--sm" onClick={() => setEditing(l)}>
                Edit
              </button>
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

      <CreateLoadModal open={creating} onClose={() => setCreating(false)} onDone={refresh} />
      <EditLoadModal load={editing} onClose={() => setEditing(null)} onDone={refresh} />
    </>
  );
}

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

function CreateLoadModal({ open, onClose, onDone }: CreateModalProps) {
  const toast = useToast();
  const create = $api.useMutation("post", "/loads");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [commodity, setCommodity] = useState("");
  const [truckType, setTruckType] = useState("");
  const [trucksNeeded, setTrucksNeeded] = useState("1");
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [customPaymentTerms, setCustomPaymentTerms] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [note, setNote] = useState("");
  const [hasBackload, setHasBackload] = useState(false);
  const [backloadOrigin, setBackloadOrigin] = useState("");
  const [backloadDestination, setBackloadDestination] = useState("");
  const [backloadCommodity, setBackloadCommodity] = useState("");
  const [backloadRate, setBackloadRate] = useState("");

  function reset() {
    setOrigin("");
    setDestination("");
    setCommodity("");
    setTruckType("");
    setTrucksNeeded("1");
    setRate("");
    setCurrency("USD");
    setPaymentTerms("");
    setCustomPaymentTerms("");
    setPickupDate("");
    setNote("");
    setHasBackload(false);
    setBackloadOrigin("");
    setBackloadDestination("");
    setBackloadCommodity("");
    setBackloadRate("");
  }

  const backloadValid = !hasBackload || (backloadOrigin.trim() !== "" && backloadDestination.trim() !== "");
  const valid =
    origin.trim() !== "" &&
    destination.trim() !== "" &&
    commodity.trim() !== "" &&
    rate.trim() !== "" &&
    Number(rate) > 0 &&
    backloadValid;

  function submit() {
    if (!valid) return;
    const body: LoadCreate = {
      origin: origin.trim(),
      destination: destination.trim(),
      commodity: commodity.trim(),
      truck_type: truckType || null,
      trucks_needed: Number(trucksNeeded) || 1,
      rate: rate.trim(),
      currency,
      payment_terms: termsValue(paymentTerms, customPaymentTerms),
      pickup_date: pickupDate || null,
      note: note.trim() || null,
      backload_origin: hasBackload ? backloadOrigin.trim() || null : null,
      backload_destination: hasBackload ? backloadDestination.trim() || null : null,
      backload_commodity: hasBackload ? backloadCommodity.trim() || null : null,
      backload_rate: hasBackload && backloadRate.trim() ? backloadRate.trim() : null,
    };
    create.mutate(
      { body },
      {
        onSuccess: () => {
          toast.push("Load posted");
          onDone();
          onClose();
          reset();
        },
        onError: (e) => toast.push(errorMessage(e), "error"),
      },
    );
  }

  function handleClose() {
    onClose();
    reset();
  }

  return (
    <Modal open={open} title="Post a load" onClose={handleClose}>
      <Field label="Origin *" hint="e.g. Durban Port">
        {(id) => <input id={id} value={origin} onChange={(e) => setOrigin(e.target.value)} required />}
      </Field>
      <Field label="Destination *" hint="e.g. Lubumbashi">
        {(id) => (
          <input id={id} value={destination} onChange={(e) => setDestination(e.target.value)} required />
        )}
      </Field>
      <Field label="Commodity *" hint="e.g. Copper cathodes">
        {(id) => (
          <input id={id} value={commodity} onChange={(e) => setCommodity(e.target.value)} required />
        )}
      </Field>
      <div className="filters">
        <Field label="Truck type">
          {(id) => (
            <select id={id} value={truckType} onChange={(e) => setTruckType(e.target.value)}>
              <option value="">Any</option>
              {TRUCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Trucks needed *">
          {(id) => (
            <input
              id={id}
              type="number"
              min={1}
              max={200}
              value={trucksNeeded}
              onChange={(e) => setTrucksNeeded(e.target.value)}
              required
            />
          )}
        </Field>
      </div>
      <div className="filters">
        <Field label="Rate per truck *">
          {(id) => (
            <input
              id={id}
              type="number"
              min="0.01"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.00"
              required
            />
          )}
        </Field>
        <Field label="Currency">
          {(id) => (
            <select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className="filters">
        <Field label="Payment terms">
          {(id) => (
            <select id={id} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
              <option value="">None</option>
              {PAYMENT_TERMS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
              <option value={CUSTOM_TERMS}>Custom...</option>
            </select>
          )}
        </Field>
        {paymentTerms === CUSTOM_TERMS && (
          <Field label="Custom terms" hint="Max 100 chars">
            {(id) => (
              <input
                id={id}
                value={customPaymentTerms}
                onChange={(e) => setCustomPaymentTerms(e.target.value)}
                maxLength={100}
                placeholder="e.g. Net 14 days"
              />
            )}
          </Field>
        )}
      </div>
      <div className="filters">
        <Field label="Pickup date">
          {(id) => (
            <input
              id={id}
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            />
          )}
        </Field>
      </div>
      <Field label="Note (optional)" hint="Max 1000 chars. Visible to staff only.">
        {(id) => (
          <textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        )}
      </Field>

      <label className="check">
        <input type="checkbox" checked={hasBackload} onChange={(e) => setHasBackload(e.target.checked)} />
        Add a backload (return load)
      </label>

      {hasBackload && (
        <fieldset className="loads-backload-form">
          <legend>Backload details</legend>
          <Field label="Backload origin *" hint="Where the truck returns from">
            {(id) => (
              <input
                id={id}
                value={backloadOrigin}
                onChange={(e) => setBackloadOrigin(e.target.value)}
                required={hasBackload}
              />
            )}
          </Field>
          <Field label="Backload destination *" hint="Where the truck returns to">
            {(id) => (
              <input
                id={id}
                value={backloadDestination}
                onChange={(e) => setBackloadDestination(e.target.value)}
                required={hasBackload}
              />
            )}
          </Field>
          <Field label="Backload commodity">
            {(id) => (
              <input
                id={id}
                value={backloadCommodity}
                onChange={(e) => setBackloadCommodity(e.target.value)}
              />
            )}
          </Field>
          <Field label="Backload rate" hint={`In ${currency}`}>
            {(id) => (
              <input
                id={id}
                type="number"
                min="0.01"
                step="0.01"
                value={backloadRate}
                onChange={(e) => setBackloadRate(e.target.value)}
                placeholder="0.00"
              />
            )}
          </Field>
        </fieldset>
      )}

      <div className="modal__actions">
        <button className="btn" onClick={handleClose}>
          Cancel
        </button>
        <button className="btn btn--primary" disabled={!valid || create.isPending} onClick={submit}>
          {create.isPending ? "Posting..." : "Post load"}
        </button>
      </div>
    </Modal>
  );
}

interface EditModalProps {
  load: Load | null;
  onClose: () => void;
  onDone: () => void;
}

function EditLoadModal({ load, onClose, onDone }: EditModalProps) {
  const toast = useToast();
  const update = $api.useMutation("patch", "/loads/{load_id}");
  const [status, setStatus] = useState("");
  const [trucksNeeded, setTrucksNeeded] = useState("");
  const [rate, setRate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [customPaymentTerms, setCustomPaymentTerms] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [note, setNote] = useState("");

  const [lastId, setLastId] = useState<number | null>(null);
  if (load && load.id !== lastId) {
    setLastId(load.id);
    setStatus(load.status);
    setTrucksNeeded(String(load.trucks_needed));
    setRate(load.rate);
    const matched = matchTerms(load.payment_terms);
    setPaymentTerms(matched.select);
    setCustomPaymentTerms(matched.custom);
    setPickupDate(load.pickup_date ?? "");
    setNote(load.note ?? "");
  }
  if (!load && lastId !== null) setLastId(null);

  function submit() {
    if (!load) return;
    const body: LoadUpdate = {};
    if (status !== load.status) body.status = status;
    const tn = Number(trucksNeeded);
    if (tn !== load.trucks_needed && tn >= 1) body.trucks_needed = tn;
    if (rate.trim() !== load.rate) body.rate = rate.trim();
    const pt = termsValue(paymentTerms, customPaymentTerms);
    if (pt !== (load.payment_terms ?? null)) body.payment_terms = pt;
    const pd = pickupDate || null;
    if (pd !== (load.pickup_date ?? null)) body.pickup_date = pd;
    const trimmed = note.trim();
    if (trimmed !== (load.note ?? "")) body.note = trimmed || null;
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { params: { path: { load_id: load.id } }, body },
      {
        onSuccess: () => {
          toast.push("Load updated");
          onDone();
          onClose();
        },
        onError: (e) => toast.push(errorMessage(e), "error"),
      },
    );
  }

  return (
    <Modal open={load !== null} title={`Edit load #${load?.id ?? ""}`} onClose={onClose}>
      {load && (
        <>
          <div className="rec__route">
            <span>{load.origin}</span>
            <span>{load.destination}</span>
          </div>
          <div className="rec__meta">{load.commodity}</div>
          {load.has_backload && (
            <div className="loads__backload">
              <span className="loads__backload-label">Backload</span>
              <div className="rec__route rec__route--sm">
                <span>{load.backload_origin}</span>
                <span>{load.backload_destination}</span>
              </div>
              <div className="rec__meta">
                {load.backload_commodity ?? "Any commodity"}
                {load.backload_rate && ` · ${money(load.backload_rate, load.currency)}`}
              </div>
            </div>
          )}

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
          <div className="filters">
            <Field label="Trucks needed">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={1}
                  max={200}
                  value={trucksNeeded}
                  onChange={(e) => setTrucksNeeded(e.target.value)}
                />
              )}
            </Field>
            <Field label={`Rate per truck (${load.currency})`}>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="filters">
            <Field label="Payment terms">
              {(id) => (
                <select id={id} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
                  <option value="">None</option>
                  {PAYMENT_TERMS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                  <option value={CUSTOM_TERMS}>Custom...</option>
                </select>
              )}
            </Field>
            {paymentTerms === CUSTOM_TERMS && (
              <Field label="Custom terms" hint="Max 100 chars">
                {(id) => (
                  <input
                    id={id}
                    value={customPaymentTerms}
                    onChange={(e) => setCustomPaymentTerms(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Net 14 days"
                  />
                )}
              </Field>
            )}
          </div>
          <div className="filters">
            <Field label="Pickup date">
              {(id) => (
                <input
                  id={id}
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              )}
            </Field>
          </div>
          <Field label="Note (optional)" hint="Max 1000 chars">
            {(id) => (
              <textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
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
        </>
      )}
    </Modal>
  );
}
