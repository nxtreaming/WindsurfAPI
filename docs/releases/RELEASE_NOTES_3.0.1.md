# v3.0.1 — Docker boot fix

2026-07-09 (UTC+9)

A patch release that fixes a critical startup bug in the v3.0.0 Docker image.

## Fixed

- **Docker image failed to boot.** Runtime code (`src/devin-connect-models.js`)
  loaded the Devin catalog snapshot from `test/fixtures/`, but the Docker image
  only ships `src/` — so `docker run` / `docker compose up` crashed on startup
  with `ENOENT: .../test/fixtures/devin-catalog-snapshot.json`. The snapshot now
  ships under `src/data/devin-catalog-snapshot.json`, so the image boots cleanly.
  Source (systemd / `node src/index.js`) deployments were unaffected.

## Notes

- No config or API changes. If you run v3.0.0 via Docker, pull `v3.0.1`
  (or `latest`) and recreate the container:
  `docker compose pull && docker compose up -d`.
- The catalog-drift test now reads the same shipped `src/data/` snapshot, so the
  guard also protects the file that actually ships.
