import { createRedirectResponse, resolveTrackingPayload } from "../src/redirect";

interface Env {
  GTM_CONTAINER_ID?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function createTrackingPage(context: EventContext<Env, string, unknown>): Response {
  const url = new URL(context.request.url);
  const payload = resolveTrackingPayload(url.pathname);

  if (!payload) {
    return createRedirectResponse(context.request);
  }

  const containerId = context.env.GTM_CONTAINER_ID?.trim();
  const payloadJson = jsonForScript({
    event: "booking_link_click",
    link_path: payload.path,
    link_source: payload.source,
    link_medium: payload.medium,
    link_campaign: payload.campaign,
    link_content: payload.content,
    eventTimeout: 1000
  });
  const destinationJson = jsonForScript(payload.destination);
  const gtmBootstrap = containerId
    ? `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer",${jsonForScript(containerId)});`
    : "";

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="robots" content="noindex, nofollow">
    <meta http-equiv="refresh" content="2;url=${escapeHtml(payload.destination)}">
    <title>Redirecting...</title>
    <script>
      window.dataLayer = window.dataLayer || [];
      var destination = ${destinationJson};
      var redirected = false;
      function continueToBooking() {
        if (redirected) return;
        redirected = true;
        window.location.replace(destination);
      }
      ${gtmBootstrap}
      window.dataLayer.push(Object.assign(${payloadJson}, {
        eventCallback: continueToBooking
      }));
      window.setTimeout(continueToBooking, 1200);
    </script>
  </head>
  <body>
    <noscript>
      <meta http-equiv="refresh" content="0;url=${escapeHtml(payload.destination)}">
      <a href="${escapeHtml(payload.destination)}">Continue to booking</a>
    </noscript>
  </body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0"
      }
    }
  );
}

export const onRequest: PagesFunction<Env> = (context) => {
  if (context.request.method === "GET") {
    return createTrackingPage(context);
  }

  return createRedirectResponse(context.request);
};
