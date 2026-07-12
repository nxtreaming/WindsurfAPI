# v3.2.5 — live-catalog alias-fold fix (burns-account regression)

2026-07-12 (UTC+9)

A one-fix release for a real defect an 8-agent code review (ultracode) caught in
the v3.2.3/v3.2.4 live-catalog work and that was then confirmed against a live
account. Full suite green (2547), i18n green.

## Fixed

- **`setLiveCatalogSelectors` no longer folds family aliases into the live
  selector set.** The upstream `GetCliModelConfigs` catalog gives each row a
  canonical `selector` (the full, upstream-accepted form, e.g.
  `gpt-5-6-sol-medium`) AND a family `alias` (e.g. `gpt-5.6-sol`) — and multiple
  effort tiers of one family share a single alias (`claude-opus-4-7-{low,medium,
  high,xhigh,max}` all alias to `claude-opus-4.7`). v3.2.3 added BOTH to the live
  existence set. For a family alias not covered by the hand-maintained
  `SELECTOR_MAP` (notably `gpt-5.6-sol`), `resolveConnectSelector` then returned
  `mapped:true` with the **bare family alias** as the selector and passed that
  straight to `GetChatMessageRequest #21` — which only accepts the full tier form
  (frame-proven: only `-medium` 200s) — tripping `UPSTREAM_INTERNAL` and burning
  the (single) account's health. This was a contributing cause of the
  `gpt-5.6-sol` / Codex `internal error` symptom (stacked on top of the separate
  content-policy trigger).
  Fix: only the canonical `selector` enters the live set. Aliases remain the job
  of `SELECTOR_MAP` (which resolves them to a real selector); an alias the map
  doesn't know now fails closed (degrade-to-free / 400 under strict) instead of
  passing through raw. The prior test that asserted the alias-fold behaviour as
  correct was replaced with a regression guard pinning "canonical recognized,
  unknown family alias NOT passed raw".

## Notes

- SELECTOR_MAP-known aliases (`claude-opus-4.7`, `claude-5-fable`, `glm-5.2`,
  `claude-opus-4.8`, …) were never affected — they resolve to their real selector
  before reaching the fold. Only upstream-added families the map hasn't caught up
  to (like `gpt-5.6-sol`) hit the bug.
- Discovered by an 8-agent ultracode review of the v3.2.1→v3.2.4 diff; the review
  scored the batch 86/100 with this as the single must-fix item. Independently
  reproduced on the live account before shipping.
