# v3.1.5 — Dashboard a11y + JS-region i18n gate + CORS & proxy SSRF fixes

2026-07-11 (UTC+9)

An accessibility and i18n-hardening release. Every change landed test-first
(a failing/asserting test first, then the change) and the dashboard work was
verified against a real headless-Chrome accessibility tree via CDP, not just
static assertions. Also closes a dashboard CORS-preflight allowlist bypass and a
DNS-rebinding TOCTOU in proxy connections. Full suite green (2527), i18n green.

## Added — accessibility

- **Segmented controls are now real radio groups.** The four `.seg-group`
  single-select toggles (pool view, overview trend range, stats chart type,
  stats range) declared `role="tablist"` while behaving as radio groups — a
  screen reader announced a tablist whose "tabs" had no selected state. They are
  now `role="radiogroup"` with `role="radio"` + `aria-checked` buttons and a
  localized group `aria-label`. Selection state was CSS-class-only; a new
  `App._syncRadioGroup` toggles `.active` **and** `aria-checked` together, and all
  six toggle handlers route through it so the a11y state always tracks the visual
  one. The `.active` CSS is unchanged (selectors key off the class, not the role).
- **Chart canvases are labelled images.** The three chart canvases
  (overview-trend, stats, model-pie) now carry `role="img"` + a dynamic
  `aria-label`. The overview trend also gets an `sr-only` data-table fallback and
  a spoken summary (`_updateTrendA11y`, refreshed on every render) so a
  screen-reader user gets the same numbers a sighted user reads off the chart.
- **Modals are dialogs with focus management.** `Utils.confirm` / `Utils.prompt`
  now render `role="dialog"` + `aria-modal="true"` + `aria-labelledby`. A new
  `App._trapFocus` keeps Tab focus cycling inside the open dialog, and the
  previously-focused element is captured on open and restored on close. The
  existing Esc/Enter handling and the custom-select Esc deferral are preserved.
- **`data-i18n-aria-label` runtime.** `I18n.apply` gained an `aria-label`
  translation handler (mirroring the existing `title` handler: store original,
  restore under zh). New `aria.*` and `overview.trend.a11y*` strings are written
  in both `en` and `zh-CN`.

## Fixed — security

- **Dashboard CORS preflight bypassed its own allowlist (#9).** The dashboard API
  had an allowlist-gated OPTIONS handler, but it was dead code: `server.js`
  answered *every* OPTIONS — including `/dashboard/api/*` — with a blanket
  `Access-Control-Allow-Origin: *` before the dashboard dispatch, so preflights
  never consulted `DASHBOARD_CORS_ORIGINS`. Not a data-read hole (actual dashboard
  responses stayed allowlist-gated, and the global preflight omits
  `X-Dashboard-Password` from `Allow-Headers`, so authenticated cross-origin calls
  were blocked at preflight regardless), but the documented "preflight shares the
  allowlist decision" never happened, and in `DASHBOARD_ALLOW_NO_AUTH=1` mode it
  weakened CSRF protection for cross-origin JSON POSTs. The global OPTIONS
  short-circuit now excludes `/dashboard/api/`, so dashboard preflights fall
  through to the allowlist handler (allowed origin echoed + `Vary: Origin`,
  disallowed origin gets no ACAO). `/v1/*` preflight is unchanged (blanket `*`,
  no credentials — correct for the open, key-authenticated API).
- **DNS-rebinding TOCTOU in proxy connections (#11 / W6).** `validateProxyHost`
  resolved a configured proxy host once for its private-IP check, but the actual
  `net.connect(host)` (SOCKS) and HTTP `CONNECT` tunnels re-resolved the hostname
  at dial time — a second DNS lookup an attacker's server can answer with a
  private address (`169.254.169.254`, `127.0.0.1`, …), turning a "public" proxy
  into an SSRF pivot into the host's internal network. New
  `net-safety.resolveProxyConnectHost` resolves the proxy host **once**, rejects
  if any returned address is private (mixed public+private rebinding answers
  included), and returns a vetted **IP literal** to dial — so the socket performs
  no second resolution and the address we validate is exactly the address we
  connect to. Wired into all five proxy connect paths (SOCKS tunnel + the four
  HTTP CONNECT tunnels, including dashboard proxy-test). Honors
  `ALLOW_PRIVATE_PROXY_HOSTS` (still pins to a literal; skips the private
  rejection). The destination reached *through* the proxy is left as a name on
  purpose — the proxy resolves it, not us.

## Added — i18n gate

- **check-i18n gate #8: hardcoded English in the App `<script>` region.** Checks
  #6/#7 stop at the `<script>` tag, leaving the entire JS half — where most
  runtime UI copy is generated — unguarded: `el.textContent = 'Save'` or an
  `innerHTML` template with English text nodes could ship untranslated with a
  green gate. The new scan flags English string literals assigned to DOM copy
  sinks (`textContent`/`placeholder`/`title`/…) and text nodes inside `innerHTML`
  templates that bypass `I18n.t()`. It is calibrated to **0 findings** on the
  current `index.html` (multi-word phrases are copy; single tokens must clear
  identifier / CONSTANT / dotted-key / URL / unit exclusions plus a
  universal-technical-term allowlist; metadata rows are split on separators). The
  gate is **warn-first** — it reports findings but does not touch the exit code,
  so a future regression is visible without breaking the build; it can be
  promoted to a hard error once the script region stays clean.

## Verification

- `npm test` → **2527/0** (+23 over v3.1.4: 12 a11y + 2 i18n + 7 proxy SSRF + 2 CORS).
- `node src/dashboard/check-i18n.js` green (including the new #8 = 0 findings).
- CDP against real headless Chrome: live-DOM radiogroup/radio roles + `aria-checked`
  toggling, canvas `image` role, sr-only trend table, `role="dialog"` modals with
  focus-return on Escape, and `Accessibility.getFullAXTree` confirming
  radiogroup/radio/image roles (no tablist) and `aria-label` switching between
  en/zh live.
