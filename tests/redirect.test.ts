import { describe, expect, it } from "vitest";
import { BOOKING_URL, createRedirectResponse, resolveDestination, STATIC_ROUTES } from "../src/redirect";

const expectedStaticDestinations: Record<string, string> = {
  "/linkedin/about": "https://cal.com/diligentic-ajay/discovery?utm_source=linkedin&utm_medium=profile&utm_campaign=brand&utm_content=ajay-about",
  "/linkedin/post": "https://cal.com/diligentic-ajay/discovery?utm_source=linkedin&utm_medium=organic&utm_campaign=brand&utm_content=ajay-post",
  "/company/about": "https://cal.com/diligentic-ajay/discovery?utm_source=linkedin&utm_medium=profile&utm_campaign=brand&utm_content=company-about",
  "/company/services": "https://cal.com/diligentic-ajay/discovery?utm_source=linkedin&utm_medium=profile&utm_campaign=brand&utm_content=company-services",
  "/youtube/channel": "https://cal.com/diligentic-ajay/discovery?utm_source=youtube&utm_medium=profile&utm_campaign=brand&utm_content=channel",
  "/youtube/comment": "https://cal.com/diligentic-ajay/discovery?utm_source=youtube&utm_medium=organic&utm_campaign=brand&utm_content=ajay-comment",
  "/facebook/intro": "https://cal.com/diligentic-ajay/discovery?utm_source=facebook-profile&utm_medium=profile&utm_campaign=brand&utm_content=ajay-intro",
  "/facebook/post": "https://cal.com/diligentic-ajay/discovery?utm_source=facebook-profile&utm_medium=organic&utm_campaign=brand&utm_content=ajay-post",
  "/instagram/post": "https://cal.com/diligentic-ajay/discovery?utm_source=instagram&utm_medium=organic&utm_campaign=brand&utm_content=ajay-post",
  "/tiktok/post": "https://cal.com/diligentic-ajay/discovery?utm_source=tiktok&utm_medium=organic&utm_campaign=brand&utm_content=ajay-post",
  "/alignable/profile": "https://cal.com/diligentic-ajay/discovery?utm_source=alignable&utm_medium=profile&utm_campaign=brand&utm_content=ideal-customers"
};

describe("resolveDestination", () => {
  it("matches every fixed route exactly", () => {
    expect(Object.keys(STATIC_ROUTES)).toHaveLength(11);
    for (const [path, destination] of Object.entries(expectedStaticDestinations)) {
      expect(resolveDestination(path)).toBe(destination);
    }
  });

  it.each([
    "support-emails-drafter",
    "document-advisor",
    "ai-call-receptionist",
    "tender-researcher",
    "Channel",
    "bad_slug"
  ])("passes a single YouTube segment through as utm_content: %s", (slug) => {
    const destination = new URL(resolveDestination(`/youtube/${slug}`));
    expect(destination.searchParams.get("utm_source")).toBe("youtube");
    expect(destination.searchParams.get("utm_medium")).toBe("organic");
    expect(destination.searchParams.get("utm_campaign")).toBe("brand");
    expect(destination.searchParams.get("utm_content")).toBe(slug);
  });

  it("decodes a safe YouTube segment and URLSearchParams re-encodes it", () => {
    const destination = new URL(resolveDestination("/youtube/video%20name"));
    expect(destination.searchParams.get("utm_content")).toBe("video name");
  });

  it("treats an encoded reserved YouTube segment as the reserved route", () => {
    expect(resolveDestination("/youtube/%63hannel")).toBe(
      expectedStaticDestinations["/youtube/channel"]
    );
  });

  it.each([
    "/",
    "/unknown",
    "/linkedin/about/",
    "/youtube/",
    "/youtube/a/b",
    "/youtube/a%2Fb",
    "/youtube/a%5Cb",
    "/youtube/%E0%A4%A"
  ])("falls back safely for %s", (path) => {
    expect(resolveDestination(path)).toBe(BOOKING_URL);
  });
});

describe("createRedirectResponse", () => {
  it("returns an uncached 302 and ignores the incoming query", () => {
    const response = createRedirectResponse(
      new Request("https://go.diligentic.ca/linkedin/about?utm_source=attacker&utm_content=attacker")
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("location")).toBe(expectedStaticDestinations["/linkedin/about"]);
  });

  it("returns the same redirect for HEAD", () => {
    const response = createRedirectResponse(
      new Request("https://go.diligentic.ca/linkedin/about", { method: "HEAD" })
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(expectedStaticDestinations["/linkedin/about"]);
  });

  it("rejects methods other than GET and HEAD", () => {
    const response = createRedirectResponse(
      new Request("https://go.diligentic.ca/linkedin/about", { method: "POST" })
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
    expect(response.headers.get("location")).toBeNull();
  });
});
