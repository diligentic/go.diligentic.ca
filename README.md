# `links.diligentic.ca`

Cloudflare Pages Function for Diligentic booking redirects. Recognized booking-path `GET` requests return a tiny noindex handoff page that pushes a `booking_link_click` event to Google Tag Manager, then redirects to the tagged Cal.com URL. Unknown paths and `HEAD` requests stay as direct `302` redirects.

## Local setup

```bash
npm install
npm run verify
npm run dev
```

Local development redirects normally even when `GTM_CONTAINER_ID` is not configured. `HEAD` requests remain plain redirects for availability monitors.

`public/index.html` exists only because Cloudflare Pages requires a non-empty output directory. `_routes.json` sends every path through `_middleware.ts`, which never calls `context.next()`, so the static file is intentionally never served.

## Cloudflare setup

1. Use the existing Pages project `go-diligentic-ca` (the project name does not need to match the custom domain).
2. Set `GTM_CONTAINER_ID` in Cloudflare Pages environment variables, or add it to `wrangler.jsonc` before deployment. Use the same GTM container that sends events to the existing Diligentic GA4 property.
3. Deploy preview, verify it, then deploy production:

```bash
npm run deploy:preview
npm run deploy:production
```

4. Add `links.diligentic.ca` to the Pages project's custom domains before creating the external DNS CNAME. Add Cloudflare's ownership-verification TXT record first if the dashboard requests one.
5. Point `links.diligentic.ca` to the assigned `<project>.pages.dev` hostname. Do not change the apex, `www`, nameservers or existing Netlify records.

The production branch must be `main`, or the deploy scripts must be changed to the branch configured as production in Cloudflare Pages.

## GTM setup

Create a GA4 event tag in GTM:

- Event name: `booking_link_click`
- Trigger: custom event `booking_link_click`
- Parameters: `link_path`, `link_source`, `link_medium`, `link_campaign`, `link_content`

Register those parameters as event-scoped custom dimensions in GA4 before relying on standard reports. Use Cal.com's GTM integration to send the booking-success event into the same GA4 property.

Cloudflare D1 is no longer used for click analytics. GA4/GTM is the reporting source of truth.

## Availability monitor

Configure an external monitor to send the following request every 5 minutes without following redirects:

```text
HEAD https://links.diligentic.ca/linkedin/about
```

Require status `302` and the exact expected `Location`. Alert by email on failure and recovery. Because the monitor uses `HEAD`, it does not write a click row.
