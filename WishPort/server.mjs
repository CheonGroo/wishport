import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createApplication,
  createArchiveItem,
  createEssay,
  createExperience,
  createQuestion,
  deleteApplication,
  deleteArchiveItem,
  deleteEssay,
  deleteExperience,
  deleteQuestion,
  ensureUserData,
  getBootstrap,
  getQuestionContext,
  saveGeneratedDraft,
  setQuestionExperiences,
  updateApplication,
  updateArchiveItem,
  updateEssay,
  updateExperience,
  updateProfile,
  updateQuestion,
} from "./db.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 4173);
const sessionSecret = process.env.SESSION_SECRET || "wish-port-local-development-secret";
const demoAuthEnabled = process.env.DEMO_AUTH_ENABLED !== "false" && !isProduction;
const requests = new Map();

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
};

const readBody = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 5_000_000) throw new Error("요청 내용이 너무 큽니다.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

const signSession = (user) => {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + 7 * 86400_000 })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

const parseCookies = (req) => Object.fromEntries(
  String(req.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }),
);

const readSession = (req) => {
  try {
    const [payload, signature] = String(parseCookies(req).wishport_session || "").split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return user.exp > Date.now() ? user : null;
  } catch {
    return null;
  }
};

const sessionCookie = (value, maxAge = 604800) => [
  `wishport_session=${encodeURIComponent(value)}`,
  "Path=/",
  "HttpOnly",
  "SameSite=Lax",
  `Max-Age=${maxAge}`,
  isProduction ? "Secure" : "",
].filter(Boolean).join("; ");

const allowRequest = (req) => {
  const key = req.socket.remoteAddress || "local";
  const current = Date.now();
  const recent = (requests.get(key) || []).filter((time) => current - time < 60_000);
  if (recent.length >= 24) return false;
  requests.set(key, [...recent, current]);
  return true;
};

const llmPrompt = ({ mode, question, job, contexts, draft, feedback, rules, reference, blindMode, charLimit }) => `
당신은 취업 자기소개서 편집자입니다. 사용자가 선택한 근거만 사용하고, 없는 성과나 숫자를 만들지 마세요.
회사/직무: ${job || "미입력"}
문항: ${question || "미입력"}
선택한 경험 근거: ${(contexts || []).join(" / ") || "없음"}
작업: ${mode === "revise" ? "기존 문장 수정" : "새 초안 생성"}
기존 초안: ${draft || "없음"}
피드백: ${feedback || "없음"}
작성 규칙: ${rules || "기본 규칙"}
문체 참고: ${reference || "별도 참고 자료 없음"}
블라인드 채용 준수: ${blindMode ? "학교명, 출신지, 가족관계 등 개인 식별 정보를 쓰지 않음" : "사용자 설정 없음"}
글자 수 제한: ${charLimit || 600}자

요구사항:
- 첫 줄에는 경험의 핵심을 압축한 짧은 소제목을 대괄호 안에 작성합니다.
- 소제목 다음에 빈 줄을 두고 한국어 자기소개서 본문을 작성합니다.
- STAR 표기는 노출하지 않되 상황(Situation), 과제(Task), 행동(Action), 결과(Result)가 순서대로 드러나는 서술형 문장으로 구성합니다.
- 과장된 AI 문체, 추상적인 미사여구, 근거 없는 수치를 피합니다.
- 문항의 글자 수 제한 안에서 작성합니다.
`.trim();

const mockEssay = ({ contextRecords = [], mode, feedback, question }) => {
  const experience = contextRecords[0] || {};
  const title = experience.title || "프로젝트";
  const situation = experience.situation || experience.evidence || "프로젝트 진행 중 핵심 과제의 기준이 명확하지 않았습니다.";
  const task = experience.task || "제한된 일정 안에 문제의 원인을 정리하고 실행 가능한 기준을 세워야 했습니다.";
  const action = experience.action || experience.evidence || "관련 기록을 다시 확인하고 우선순위와 역할을 실행 단위로 나눴습니다.";
  const result = experience.result || "그 결과 팀이 같은 기준으로 움직일 수 있었고 핵심 결과물을 완성했습니다.";
  const headingResult = result.replace(/[.!?].*$/, "").slice(0, 24);
  const revision = mode === "revise" && feedback ? ` 수정 과정에서는 '${feedback}'이라는 기준에 맞춰 표현을 다시 정리했습니다.` : "";
  return `[${title}, ${headingResult}]\n\n${question ? "문항의 핵심을 실제 경험으로 설명하겠습니다. " : ""}${situation} 당시 제가 해결해야 할 과제는 ${task} 저는 ${action} 그 결과 ${result}${revision} 이 경험을 바탕으로 지원 직무에서도 근거를 확인하고 관계자와 기준을 맞추며 맡은 일을 결과로 연결하겠습니다.`;
};

async function callOpenAI(payload) {
  if (!process.env.OPENAI_API_KEY) return { text: mockEssay(payload), demo: true };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: llmPrompt(payload), max_output_tokens: 1200 }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`LLM API ${response.status}`);
    const result = await response.json();
    const text = result.output_text || result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("LLM 응답에서 본문을 찾지 못했습니다.");
    return { text, demo: false };
  } finally {
    clearTimeout(timer);
  }
}

const requireUser = (req, res) => {
  const user = readSession(req);
  if (!user) json(res, 401, { error: "로그인이 필요합니다." });
  return user;
};

const notFound = (res, label = "항목") => json(res, 404, { error: `${label}을 찾지 못했습니다.` });

export async function handleApi(req, res, pathname) {
  if (pathname === "/api/config" && req.method === "GET") {
    return json(res, 200, {
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
      llmEnabled: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      demoAuthEnabled,
    });
  }

  if (pathname === "/api/session" && req.method === "GET") return json(res, 200, { user: readSession(req) });

  if (pathname === "/api/auth/demo" && req.method === "POST") {
    if (!demoAuthEnabled) return json(res, 403, { error: "데모 로그인이 비활성화되어 있습니다." });
    const user = { id: "demo-user", name: "천그루", email: "groo@example.com", picture: "" };
    ensureUserData(user);
    return json(res, 200, { user }, { "Set-Cookie": sessionCookie(signSession(user)) });
  }

  if (pathname === "/api/auth/google" && req.method === "POST") {
    if (!process.env.GOOGLE_CLIENT_ID) return json(res, 503, { error: "Google Client ID가 설정되지 않았습니다." });
    const { credential } = await readBody(req);
    const verify = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential || "")}`);
    if (!verify.ok) return json(res, 401, { error: "Google 로그인을 확인하지 못했습니다." });
    const profile = await verify.json();
    const validIssuer = profile.iss === "https://accounts.google.com" || profile.iss === "accounts.google.com";
    const emailVerified = profile.email_verified === true || profile.email_verified === "true";
    if (!validIssuer || profile.aud !== process.env.GOOGLE_CLIENT_ID || !emailVerified) return json(res, 401, { error: "허용되지 않은 Google 계정입니다." });
    const user = { id: profile.sub, name: profile.name || profile.email, email: profile.email, picture: profile.picture || "" };
    ensureUserData(user);
    return json(res, 200, { user }, { "Set-Cookie": sessionCookie(signSession(user)) });
  }

  if (pathname === "/api/logout" && req.method === "POST") return json(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });

  const user = requireUser(req, res);
  if (!user) return;
  const parts = pathname.split("/").filter(Boolean);

  if (pathname === "/api/bootstrap" && req.method === "GET") return json(res, 200, getBootstrap(user));

  if (pathname === "/api/profile" && req.method === "PATCH") {
    return json(res, 200, { profile: updateProfile(user.id, await readBody(req)) });
  }

  if (pathname === "/api/experiences" && req.method === "POST") {
    const body = await readBody(req);
    if (!String(body.title || "").trim()) return json(res, 400, { error: "경험 이름을 입력해 주세요." });
    return json(res, 201, { experience: createExperience(user.id, body) });
  }
  if (parts[1] === "experiences" && parts[2] && req.method === "PATCH") {
    const experience = updateExperience(user.id, parts[2], await readBody(req));
    return experience ? json(res, 200, { experience }) : notFound(res, "경험");
  }
  if (parts[1] === "experiences" && parts[2] && req.method === "DELETE") {
    return deleteExperience(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res, "경험");
  }

  if (pathname === "/api/archive-items" && req.method === "POST") {
    const body = await readBody(req);
    if (!String(body.title || "").trim()) return json(res, 400, { error: "항목 이름을 입력해 주세요." });
    return json(res, 201, { item: createArchiveItem(user.id, body) });
  }
  if (parts[1] === "archive-items" && parts[2] && req.method === "PATCH") {
    const item = updateArchiveItem(user.id, parts[2], await readBody(req));
    return item ? json(res, 200, { item }) : notFound(res);
  }
  if (parts[1] === "archive-items" && parts[2] && req.method === "DELETE") {
    return deleteArchiveItem(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res);
  }

  if (pathname === "/api/essays" && req.method === "POST") return json(res, 201, { essay: createEssay(user.id, await readBody(req)) });
  if (parts[1] === "essays" && parts[2] && req.method === "PATCH") {
    const essay = updateEssay(user.id, parts[2], await readBody(req));
    return essay ? json(res, 200, { essay }) : notFound(res, "자기소개서");
  }
  if (parts[1] === "essays" && parts[2] && req.method === "DELETE") {
    return deleteEssay(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res, "자기소개서");
  }

  if (parts[1] === "questions" && parts[2] && parts[3] === "context" && req.method === "PUT") {
    const body = await readBody(req);
    const question = setQuestionExperiences(user.id, parts[2], Array.isArray(body.experienceIds) ? body.experienceIds : []);
    return question ? json(res, 200, { question }) : notFound(res, "문항");
  }
  if (parts[1] === "questions" && parts[2] && req.method === "PATCH") {
    const question = updateQuestion(user.id, parts[2], await readBody(req));
    return question ? json(res, 200, { question }) : notFound(res, "문항");
  }
  if (parts[1] === "essays" && parts[2] && parts[3] === "questions" && req.method === "POST") {
    try {
      const question = createQuestion(user.id, parts[2], await readBody(req));
      return question ? json(res, 201, { question }) : notFound(res, "자기소개서");
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }
  if (parts[1] === "questions" && parts[2] && req.method === "DELETE") {
    try {
      return deleteQuestion(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res, "문항");
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (pathname === "/api/applications" && req.method === "POST") return json(res, 201, { application: createApplication(user.id, await readBody(req)) });
  if (parts[1] === "applications" && parts[2] && req.method === "PATCH") {
    const application = updateApplication(user.id, parts[2], await readBody(req));
    return application ? json(res, 200, { application }) : notFound(res, "지원 항목");
  }
  if (parts[1] === "applications" && parts[2] && req.method === "DELETE") {
    return deleteApplication(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res, "지원 항목");
  }

  if (pathname === "/api/llm/essay" && req.method === "POST") {
    if (!allowRequest(req)) return json(res, 429, { error: "잠시 후 다시 시도해 주세요." });
    const body = await readBody(req);
    const context = getQuestionContext(user.id, body.questionId);
    if (!context) return notFound(res, "문항");
    const payload = {
      mode: body.mode === "revise" ? "revise" : "generate",
      question: context.question.prompt,
      job: `${context.question.company} · ${context.question.role}`,
      contexts: context.contexts.flatMap((item) => [
        item.title,
        `상황: ${item.situation || item.evidence}`,
        `과제: ${item.task || ""}`,
        `행동: ${item.action || item.evidence}`,
        `결과: ${item.result || ""}`,
      ]),
      contextRecords: context.contexts,
      draft: context.question.draft,
      feedback: String(body.feedback ?? context.question.feedback ?? ""),
      rules: context.question.ai_rules,
      reference: context.question.reference_text,
      blindMode: Boolean(context.question.blind_mode),
      charLimit: context.question.char_limit,
    };
    try {
      const result = await callOpenAI(payload);
      const question = saveGeneratedDraft(user.id, body.questionId, result.text);
      return json(res, 200, { ...result, question });
    } catch (error) {
      return json(res, 502, { error: error.name === "AbortError" ? "AI 응답 시간이 초과되었습니다." : "AI 문장을 생성하지 못했습니다." });
    }
  }

  return json(res, 404, { error: "요청한 API를 찾지 못했습니다." });
}

let vite;
if (!isProduction && process.env.WISHPORT_NO_LISTEN !== "1") {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: "spa" });
}

const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
export const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url.pathname);
    if (vite) return vite.middlewares(req, res, () => json(res, 404, { error: "화면을 찾지 못했습니다." }));

    const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const distRoot = resolve(join(__dirname, "dist"));
    const requested = resolve(join(distRoot, relative));
    const safeTarget = requested.startsWith(`${distRoot}/`) || requested === join(distRoot, "index.html") ? requested : join(distRoot, "index.html");
    try {
      const body = await readFile(safeTarget);
      res.writeHead(200, { "Content-Type": mime[extname(safeTarget)] || "text/html; charset=utf-8" });
      res.end(body);
    } catch {
      const body = await readFile(join(distRoot, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(body);
    }
  } catch (error) {
    json(res, error instanceof SyntaxError ? 400 : 500, { error: error.message || "처리 중 오류가 발생했습니다." });
  }
});

if (process.env.WISHPORT_NO_LISTEN !== "1") {
  server.listen(port, "127.0.0.1", () => console.log(`Wish Port is running at http://127.0.0.1:${port}`));
}
