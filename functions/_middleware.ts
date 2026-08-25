import { createRedirectResponse, isTrackablePath } from "../src/redirect";

interface Env {
  CLICKS_DB: D1Database;
}

function reportWriteFailure(): void {
  console.error("D1 click insert failed");
}

export const onRequest: PagesFunction<Env> = (context) => {
  const response = createRedirectResponse(context.request);
  const pathname = new URL(context.request.url).pathname;

  if (context.request.method === "GET" && isTrackablePath(pathname)) {
    const clickedAt = Date.now();
    try {
      const write = Promise.resolve(
        context.env.CLICKS_DB.prepare(
          "INSERT INTO clicks (path, clicked_at) VALUES (?1, ?2)"
        )
          .bind(pathname, clickedAt)
          .run()
      ).catch(reportWriteFailure);

      context.waitUntil(write);
    } catch {
      reportWriteFailure();
    }
  }

  return response;
};
