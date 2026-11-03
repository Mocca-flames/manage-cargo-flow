// Turns any thrown/returned API error into a human-readable message.
// FastAPI errors look like { detail: "text" } or { detail: [{ msg: "text", ... }] }.
export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "detail" in err) {
    const detail = (err as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
        .join("; ");
    }
  }
  if (err instanceof TypeError) return "Network problem. Check your connection and try again.";
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}
