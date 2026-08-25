import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../functions/_middleware";

type PendingTask = Promise<unknown>;

function createContext(
  method = "GET",
  run = vi.fn().mockResolvedValue({ success: true }),
  url = "https://go.diligentic.ca/linkedin/about"
) {
  const boundValues: unknown[][] = [];
  const pending: PendingTask[] = [];
  const bind = vi.fn((...values: unknown[]) => {
    boundValues.push(values);
    return { run };
  });
  const prepare = vi.fn(() => ({ bind }));
  const context = {
    request: new Request(url, { method }),
    env: { CLICKS_DB: { prepare } },
    waitUntil: (promise: PendingTask) => pending.push(promise)
  };

  return { context, pending, boundValues, prepare, bind, run };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Pages middleware", () => {
  it("writes only path and timestamp for GET", async () => {
    const { context, pending, boundValues, prepare } = createContext();
    const response = await onRequest(context as never);
    await Promise.all(pending);

    expect(response.status).toBe(302);
    expect(prepare).toHaveBeenCalledWith(
      "INSERT INTO clicks (path, clicked_at) VALUES (?1, ?2)"
    );
    expect(boundValues).toHaveLength(1);
    expect(boundValues[0][0]).toBe("/linkedin/about");
    expect(boundValues[0][1]).toEqual(expect.any(Number));
    expect(boundValues[0]).toHaveLength(2);
  });

  it("does not store the incoming query string", async () => {
    const { context, pending, boundValues } = createContext(
      "GET",
      vi.fn().mockResolvedValue({ success: true }),
      "https://go.diligentic.ca/linkedin/about?utm_source=attacker&private=value"
    );

    await onRequest(context as never);
    await Promise.all(pending);

    expect(boundValues).toEqual([["/linkedin/about", expect.any(Number)]]);
  });

  it("does not write for HEAD", async () => {
    const { context, pending, prepare } = createContext("HEAD");
    const response = await onRequest(context as never);

    expect(response.status).toBe(302);
    expect(prepare).not.toHaveBeenCalled();
    expect(pending).toHaveLength(0);
  });

  it("returns the redirect immediately while the write is pending", async () => {
    let finishWrite: (() => void) | undefined;
    const delayedWrite = new Promise<{ success: true }>((resolve) => {
      finishWrite = () => resolve({ success: true });
    });
    const { context, pending } = createContext("GET", vi.fn(() => delayedWrite));

    const response = await onRequest(context as never);
    expect(response.status).toBe(302);
    expect(pending).toHaveLength(1);

    finishWrite?.();
    await Promise.all(pending);
  });

  it("keeps the redirect successful when D1 rejects the write", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { context, pending } = createContext(
      "GET",
      vi.fn().mockRejectedValue(new Error("database unavailable"))
    );

    const response = await onRequest(context as never);
    await Promise.all(pending);

    expect(response.status).toBe(302);
    expect(error).toHaveBeenCalledWith("D1 click insert failed");
  });

  it("keeps the redirect successful when D1 throws synchronously", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { context, pending } = createContext();
    context.env.CLICKS_DB.prepare = vi.fn(() => {
      throw new Error("binding unavailable");
    });

    const response = await onRequest(context as never);

    expect(response.status).toBe(302);
    expect(pending).toHaveLength(0);
    expect(error).toHaveBeenCalledWith("D1 click insert failed");
  });
});
