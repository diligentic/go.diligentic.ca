const DEFAULT_DISCOVERY_BOOKING_URL = "https://cal.com/diligentic-ajay/discovery";
const CRCA_CWIC_BOOKING_URL = "https://cal.com/diligentic-ajay/crca-cwic-members";

type Attribution = Readonly<{
  source: string;
  medium: string;
  content: string;
  campaign?: string;
  bookingUrl?: string;
}>;

export type TrackingPayload = Readonly<{
  path: string;
  destination: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
}>;

const BRAND_CAMPAIGN = "brand";

const STATIC_ROUTES: Readonly<Record<string, Attribution>> = Object.freeze({
  "/linkedin/about": { source: "linkedin", medium: "profile", content: "ajay-about" },
  "/linkedin/post": { source: "linkedin", medium: "organic", content: "ajay-post" },
  "/linkedin/services": { source: "linkedin", medium: "profile", content: "ajay-services" },
  "/company/about": { source: "linkedin", medium: "profile", content: "company-about" },
  "/company/services": { source: "linkedin", medium: "profile", content: "company-services" },
  "/youtube/yycaiguy": { source: "youtube", medium: "profile", content: "ajay-channel" },
  "/youtube/company": { source: "youtube", medium: "profile", content: "company-channel" },
  "/email/ajay": { source: "email-direct", medium: "email", content: "ajay" },
  "/alignable/profile": { source: "alignable", medium: "profile", content: "ideal-customers" },
  "/clutch/profile": { source: "clutch", medium: "profile", content: "company-profile" },
  "/linkedin/cta": { source: "linkedin", medium: "profile", content: "ajay-cta" },
  "/linkedin/dm": { source: "linkedin", medium: "dm", content: "ajay-dm" },
  "/company/cta": { source: "linkedin", medium: "profile", content: "company-cta" },
  "/facebook/profile": { source: "facebook-profile", medium: "profile", content: "ajay-contact" },
  "/facebook/page": { source: "facebook-page", medium: "profile", content: "book-now" },
  "/facebook/group": { source: "facebook-group", medium: "organic", content: "group-post" },
  "/facebook/dm": { source: "facebook-profile", medium: "dm", content: "ajay-dm" },
  "/instagram/bio": { source: "instagram", medium: "profile", content: "ajay-bio" },
  "/instagram/dm": { source: "instagram", medium: "dm", content: "ajay-dm" },
  "/tiktok/bio": { source: "tiktok", medium: "profile", content: "ajay-bio" },
  "/tiktok/dm": { source: "tiktok", medium: "dm", content: "ajay-dm" },
  "/alignable/dm": { source: "alignable", medium: "dm", content: "ajay-dm" },
  "/gmb/book": { source: "gmb", medium: "profile", content: "book-online" },
  "/crca-cwic/members": {
    source: "partner",
    medium: "organic",
    content: "crca-cwic",
    campaign: "crca-perk-oct26",
    bookingUrl: CRCA_CWIC_BOOKING_URL
  }
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

  const staticAttribution = STATIC_ROUTES[`/youtube/${segment}`];
  if (staticAttribution) return staticAttribution;

  return { source: "youtube", medium: "organic", content: segment };
}

function buildTaggedDestination(attribution: Attribution): string {
  const destination = new URL(attribution.bookingUrl ?? DEFAULT_DISCOVERY_BOOKING_URL);
  destination.searchParams.set("utm_source", attribution.source);
  destination.searchParams.set("utm_medium", attribution.medium);
  destination.searchParams.set("utm_campaign", attribution.campaign ?? BRAND_CAMPAIGN);
  destination.searchParams.set("utm_content", attribution.content);
  return destination.toString();
}

export function resolveDestination(pathname: string): string {
  const attribution = STATIC_ROUTES[pathname] ?? youtubeAttribution(pathname);
  return attribution ? buildTaggedDestination(attribution) : DEFAULT_DISCOVERY_BOOKING_URL;
}

export function resolveTrackingPayload(pathname: string): TrackingPayload | undefined {
  const attribution = STATIC_ROUTES[pathname] ?? youtubeAttribution(pathname);
  if (!attribution) {
    return undefined;
  }

  return {
    path: pathname,
    destination: buildTaggedDestination(attribution),
    source: attribution.source,
    medium: attribution.medium,
    campaign: attribution.campaign ?? BRAND_CAMPAIGN,
    content: attribution.content
  };
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

export function isTrackablePath(pathname: string): boolean {
  return resolveTrackingPayload(pathname) !== undefined;
}

export { DEFAULT_DISCOVERY_BOOKING_URL, STATIC_ROUTES };
