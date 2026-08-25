# `go.diligentic.ca`

Cloudflare Pages Function for Diligentic booking redirects. It records exactly 2 values for each recognized booking-path `GET`: the request path and a UTC Unix timestamp in milliseconds. Unknown paths still redirect to the bare booking URL but are not recorded, preventing generic crawler traffic from polluting click totals. It does not store query strings, destinations, IP addresses, user agents, referrers, cookies or identifiers.

## Local setup

```bash
npm install
npm run verify
npm run db:migrate:local
npm run dev
```

Local D1 data is isolated by Wrangler. `HEAD` requests redirect without creating a row.

`public/index.html` exists only because Cloudflare Pages requires a non-empty output directory. `_routes.json` sends every path through `_middleware.ts`, which never calls `context.next()`, so the static file is intentionally never served.

## Cloudflare setup

1. Create the Pages project `go-diligentic-ca`.
2. Create D1 databases named `go-diligentic-clicks-preview` and `go-diligentic-clicks-production`.
3. Replace the top-level zero UUID in `wrangler.jsonc` with the production database ID and the `env.preview` zero UUID with the preview database ID.
4. Apply both migrations:

```bash
npm run db:migrate:preview
npm run db:migrate:production
```

5. Deploy preview, verify it, then deploy production:

```bash
npm run deploy:preview
npm run deploy:production
```

6. Add `go.diligentic.ca` to the Pages project's custom domains before creating the external DNS CNAME. Add Cloudflare's ownership-verification TXT record first if the dashboard requests one.
7. Point `go.diligentic.ca` to the assigned `<project>.pages.dev` hostname. Do not change the apex, `www`, nameservers or existing Netlify records.

The production branch must be `main`, or the deploy scripts must be changed to the branch configured as production in Cloudflare Pages. Top-level Wrangler bindings apply to production; `env.preview` overrides them for preview deployments.

## Reporting

The interval is inclusive at the start and exclusive at the end. Inputs must use ISO 8601 UTC with a trailing `Z`; timezone-less values and offsets are rejected:

```bash
npm run report -- go-diligentic-clicks-production 2026-09-01T00:00:00Z 2026-10-01T00:00:00Z
```

The output is request count grouped by recognized booking path. The report also filters historical crawler paths collected before booking-path-only logging was introduced. It is not a unique-user count. Compare it with Cal.com/Twenty bookings over the same UTC interval using `utm_source` and `utm_content`.

## Availability monitor

Configure an external monitor to send the following request every 5 minutes without following redirects:

```text
HEAD https://go.diligentic.ca/linkedin/about
```

Require status `302` and the exact expected `Location`. Alert by email on failure and recovery. Because the monitor uses `HEAD`, it does not write a click row.
