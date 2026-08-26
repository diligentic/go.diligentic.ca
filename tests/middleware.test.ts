import { describe, expect, it } from "vitest";
import { onRequest } from "../functions/_middleware";

function createContext(
  method = "GET",
  url = "https://go.diligentic.ca/linkedin/about",
  gtmContainerId = "GTM-TEST123"
) {
  return {
    request: new Request(url, { method }),
    env: { GTM_CONTAINER_ID: gtmContainerId },
    waitUntil: () => undefined
  };
}

describe("Pages middleware", () => {
  it("serves a GTM tracking handoff page for recognized GET paths", async () => {
    const response = await onRequest(createContext() as never);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(body).toContain("https://www.googletagmanager.com/gtm.js?id=");
    expect(body).toContain("GTM-TEST123");
    expect(body).toContain("booking_link_click");
    expect(body).toContain('"link_path":"/linkedin/about"');
    expect(body).toContain('"link_source":"linkedin"');
    expect(body).toContain('"link_medium":"profile"');
    expect(body).toContain('"link_campaign":"brand"');
    expect(body).toContain('"link_content":"ajay-about"');
    expect(body).toContain(
      "https://cal.com/diligentic-ajay/discovery?utm_source=linkedin"
    );
  });

  it("serves a tracking handoff page even if the GTM id is not configured", async () => {
    const response = await onRequest(createContext("GET", undefined, "") as never);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).not.toContain("googletagmanager.com/gtm.js");
    expect(body).toContain("booking_link_click");
    expect(body).toContain("window.setTimeout(continueToBooking, 1200)");
  });

  it("does not preserve attacker query parameters in the destination", async () => {
    const response = await onRequest(
      createContext(
        "GET",
        "https://go.diligentic.ca/linkedin/about?utm_source=attacker&private=value"
      ) as never
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"link_source":"linkedin"');
    expect(body).not.toContain("attacker");
    expect(body).not.toContain("private=value");
  });

  it("escapes encoded YouTube content for script context", async () => {
    const response = await onRequest(
      createContext("GET", "https://go.diligentic.ca/youtube/%3Cscript%3E") as never
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("\\u003cscript\\u003e");
    expect(body).not.toContain('"link_content":"<script>"');
  });

  it("keeps HEAD as a plain redirect for availability monitors", async () => {
    const response = await onRequest(createContext("HEAD") as never);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://cal.com/diligentic-ajay/discovery?utm_source=linkedin&utm_medium=profile&utm_campaign=brand&utm_content=ajay-about"
    );
  });

  it.each([
    "/",
    "/favicon.ico",
    "/.env",
    "/.git/HEAD",
    "/unknown",
    "/youtube/foo%2Fbar"
  ])("keeps unrecognized GET paths as direct redirects: %s", async (path) => {
    const response = await onRequest(
      createContext("GET", `https://go.diligentic.ca${path}`) as never
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://cal.com/diligentic-ajay/discovery"
    );
  });

  it("rejects methods other than GET and HEAD", async () => {
    const response = await onRequest(createContext("POST") as never);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
    expect(response.headers.get("location")).toBeNull();
  });
});
