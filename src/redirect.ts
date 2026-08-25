const BOOKING_URL = "https://cal.com/diligentic-ajay/discovery";

type Attribution = Readonly<{
  source: string;
  medium: string;
  content: string;
}>;

const BRAND_CAMPAIGN = "brand";

const STATIC_ROUTES: Readonly<Record<string, Attribution>> = Object.freeze({
  "/linkedin/about": { source: "linkedin", medium: "profile", content: "ajay-about" },
  "/linkedin/post": { source: "linkedin", medium: "organic", content: "ajay-post" },
  "/company/about": { source: "linkedin", medium: "profile", content: "company-about" },
  "/company/services": { source: "linkedin", medium: "profile", content: "company-services" },
  "/youtube/channel": { source: "youtube", medium: "profile", content: "channel" },
  "/youtube/comment": { source: "youtube", medium: "organic", content: "ajay-comment" },
  "/facebook/intro": { source: "facebook-profile", medium: "profile", content: "ajay-intro" },
  "/facebook/post": { source: "facebook-profile", medium: "organic", content: "ajay-post" },
  "/instagram/post": { source: "instagram", medium: "organic", content: "ajay-post" },
  "/tiktok/post": { source: "tiktok", medium: "organic", content: "ajay-post" },
  "/alignable/profile": { source: "alignable", medium: "profile", content: "ideal-customers" }
});

function youtubeAttribution(pathname: string): Attribution | undefined {
  const match = /^\/youtube\/([^/]+)$/u.exec(pathname);
  if (!match) {
    return undefined;
  }

  let segment: string;
  try {
    segment = decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }

  if (!segment || segment.includes("/") || segment.includes("\\")) {
    return undefined;
  }

  if (segment === "channel") {
    return STATIC_ROUTES["/youtube/channel"];
  }

  if (segment === "comment") {
    return STATIC_ROUTES["/youtube/comment"];
  }

  return { source: "youtube", medium: "organic", content: segment };
}

function buildTaggedDestination(attribution: Attribution): string {
  const destination = new URL(BOOKING_URL);
  destination.searchParams.set("utm_source", attribution.source);
  destination.searchParams.set("utm_medium", attribution.medium);
  destination.searchParams.set("utm_campaign", BRAND_CAMPAIGN);
  destination.searchParams.set("utm_content", attribution.content);
  return destination.toString();
}

export function resolveDestination(pathname: string): string {
  const attribution = STATIC_ROUTES[pathname] ?? youtubeAttribution(pathname);
  return attribution ? buildTaggedDestination(attribution) : BOOKING_URL;
}

export function createRedirectResponse(request: Request): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
        "Cache-Control": "no-store, max-age=0"
      }
    });
  }

  const pathname = new URL(request.url).pathname;
  return new Response(null, {
    status: 302,
    headers: {
      Location: resolveDestination(pathname),
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

export { BOOKING_URL, STATIC_ROUTES };
