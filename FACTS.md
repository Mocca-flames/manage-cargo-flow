# Facts to collect before coding

Write answers here before starting development. Ask the human for anything missing.

| Fact | Example | Needed in | Answer |
|---|---|---|---|
| Backend running locally at | `http://localhost:8000` | Phase 2, 4 | |
| `/openapi.json` reachable | `curl http://localhost:8000/openapi.json` returns JSON | Phase 4 | |
| Production API URL | `https://api.company.com` | Phase 2 | `https://api.cargoflowafrica.co.za` |
| Production web URL | `https://manage.cargoflowafrica.co.za/` | Phase 10, 11 | Cloudflare `.pages.dev` URL such as `https://<project>.pages.dev` (custom domain later if needed) |
| Login endpoint: path, request body, response (token field name) | unknown (not in the API doc) | Phase 5 | |
| Endpoint that returns the current user, **or** confirmation the token is a JWT containing the user fields | unknown | Phase 5 | |
| Change-password endpoint | unknown | Phase 5 | |
| Allowed `status` values for companies | unknown | Phase 8 | |
| Logo as `logo.svg` (square, simple) | | Phase 2 | |
| App name and short name | "Freight Ops" / "Freight" | Phase 2 | `"Cargo Flow"` / `"Cargo Flow"` |
| Brand palette | CSS tokens to keep future updates easy | Phase 2, 3 | `--color-canvas: #f8f4eb; --color-canvas-alt: #e8d8b9; --color-ink: #12382f; --color-ink-muted: #3d5449; --color-accent-gold: #d4a44c; --color-accent-terracotta: #b9623e; --color-surface: #ffffff; --color-border: #dccba9;` |
| Onboarding screens in this portal | yes / no | Phase 8 | **No — out of scope.** Verified in the backend onboarding router: `/onboarding/start`, `/verify-code`, `/submit` are public (transporter self-onboarding, built in `cargoflow_transport`). `/onboarding/staff-submit` (admin, director) is called server-side by `POST /load-interests/{id}/convert`, so lead conversion already covers it. No management screen needed. |

**CHECKPOINT 0:** Open `http://localhost:8000/openapi.json` and see paths. If not, STOP AND ASK.

## Notes

- **Always create files as UTF-8.** UTF-16 files pass `tsc` but break vite's bundler and oxlint ("stream did not contain valid UTF-8"). On 2026-11-03 all `src/` files had to be converted to UTF-8 after this broke lint; keep every new file UTF-8 from the start.
