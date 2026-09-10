import { handleApi } from "../server.mjs";

// Vercel serverless entry point: every request under /api/* lands here.
// The actual routing/business logic lives in server.mjs (handleApi), shared
// with the local `node server.mjs` dev/prod server so there's one code path.
export default async function handler(req, res) {
  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  try {
    await handleApi(req, res, url.pathname);
  } catch (error) {
    res.statusCode = error instanceof SyntaxError ? 400 : 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: error.message || "처리 중 오류가 발생했습니다." }));
  }
}
