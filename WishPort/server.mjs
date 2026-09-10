import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import {
  createApplication,
  createArchiveItem,
  createCustomQuestion,
  createEssay,
  createExperience,
  createInterviewSet,
  createInterviewWeakSpotArchiveItem,
  createQuestion,
  deleteApplication,
  deleteArchiveItem,
  deleteEssay,
  deleteExperience,
  deleteInterviewQuestion,
  deleteInterviewSet,
  deleteQuestion,
  ensureUserData,
  getBootstrap,
  getQuestionContext,
  reorderInterviewSetQuestions,
  saveGeneratedDraft,
  setQuestionExperiences,
  updateApplication,
  updateArchiveItem,
  updateEssay,
  updateExperience,
  updateInterviewAnswerAsset,
  updateInterviewQuestionAnswer,
  updateProfile,
  updateQuestion,
  upsertInterviewAnswerAsset,
} from "./supabaseDb.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
try {
  loadEnvFile(join(__dirname, ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 4173);
const sessionSecret = process.env.SESSION_SECRET || "wish-port-local-development-secret";
const demoAuthEnabled = process.env.DEMO_AUTH_ENABLED !== "false" && !isProduction;
const requests = new Map();
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

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

const archiveInterviewPrompt = (answers = {}) => `
당신은 취업 준비용 경험 아카이브 편집자입니다. 사용자의 답변만 근거로 Archive 경험 카드를 JSON으로 정리하세요.

프로젝트/경험: ${answers.project || "미입력"}
상황/맥락: ${answers.context || "미입력"}
어려웠던 문제: ${answers.problem || "미입력"}
직접 한 행동: ${answers.action || "미입력"}
결과/배운 점: ${answers.result || "미입력"}

JSON만 반환하세요. 코드블록을 쓰지 마세요.
스키마:
{
  "title": "짧은 프로젝트명 또는 경험명",
  "meta": "역할 · 유형",
  "summary": "이력서에 넣기 좋은 한 문장 요약",
  "evidence": "자기소개서 근거로 쓸 수 있는 구체적 원본 근거",
  "star": {
    "situation": "상황",
    "task": "과제",
    "action": "행동",
    "result": "결과"
  },
  "chips": [
    ["핵심 소재", "material"],
    ["확인된 결과", "result"],
    ["드러나는 역량", "skill"],
    ["산출물", "output"]
  ]
}

규칙:
- 사용자가 말하지 않은 수치, 수상, 성과를 만들지 마세요.
- 비어 있는 답변은 추측하지 말고 담백하게 일반화하세요.
- title은 20자 이내로 작성하세요.
- chips의 두 번째 값은 material, result, skill, output 중 하나여야 합니다.
`.trim();

function parseJsonObject(text) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
    return JSON.parse(match[0]);
  }
}

function normalizeExperiencePayload(value = {}) {
  const star = value.star || {};
  const chips = Array.isArray(value.chips)
    ? value.chips
        .filter((chip) => Array.isArray(chip) && chip[0])
        .map(([label, tone]) => [
          String(label).slice(0, 28),
          ["material", "result", "skill", "output"].includes(tone)
            ? tone
            : "material",
        ])
        .slice(0, 4)
    : [];
  return {
    title: String(value.title || "새 경험").trim().slice(0, 40),
    meta: String(value.meta || "").trim().slice(0, 80),
    summary: String(value.summary || "").trim(),
    evidence: String(value.evidence || "").trim(),
    star: {
      situation: String(star.situation || "").trim(),
      task: String(star.task || "").trim(),
      action: String(star.action || "").trim(),
      result: String(star.result || "").trim(),
    },
    chips,
  };
}

function mockArchiveExperience(answers = {}) {
  const title = String(answers.project || "새 경험").trim();
  const context = String(answers.context || "구체적인 맥락을 정리하는 중입니다.").trim();
  const problem = String(answers.problem || "해결해야 할 문제가 있었습니다.").trim();
  const action = String(answers.action || "문제를 나누어 확인하고 실행 가능한 방식으로 정리했습니다.").trim();
  const result = String(answers.result || "그 과정에서 실행 기준을 세우는 법을 배웠습니다.").trim();
  return normalizeExperiencePayload({
    title,
    meta: "경험 정리 · Archive",
    summary: `${title}에서 문제를 구조화하고 실행 기준을 만든 경험.`,
    evidence: `${context} ${problem} ${action} ${result}`,
    star: { situation: context, task: problem, action, result },
    chips: [
      ["문제 구조화", "material"],
      ["실행 기준 정리", "result"],
      ["문제해결", "skill"],
      ["경험 아카이브", "output"],
    ],
  });
}

async function callGeminiText(prompt) {
  if (!gemini) return null;
  const response = await gemini.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: prompt,
  });
  return response.text;
}

async function callGeminiFile(prompt, file = {}) {
  if (!gemini) return null;
  const base64 = String(file.data || "").split(",").pop();
  const response = await gemini.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: file.type || "application/octet-stream",
              data: base64,
            },
          },
        ],
      },
    ],
  });
  return response.text;
}

async function structureArchiveExperience(answers) {
  const prompt = archiveInterviewPrompt(answers);
  if (gemini) {
    const text = await callGeminiText(prompt);
    return { experience: normalizeExperiencePayload(parseJsonObject(text)), provider: "gemini" };
  }
  if (process.env.OPENAI_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: prompt, max_output_tokens: 900 }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`OpenAI API ${response.status}`);
      const result = await response.json();
      const text = result.output_text || result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
      return { experience: normalizeExperiencePayload(parseJsonObject(text)), provider: "openai" };
    } finally {
      clearTimeout(timer);
    }
  }
  return { experience: mockArchiveExperience(answers), provider: "demo" };
}

async function extractArchiveItemFromFile(file = {}, kind = "achievement") {
  const label = kind === "asset" ? "수상 경력 또는 교육사항" : "어학성적 또는 자격증";
  const prompt = `
첨부된 ${label} 증빙 파일에서 사용자가 Archive에 저장할 정보를 JSON으로 추출하세요.
보이지 않는 정보는 빈 문자열로 두고, 추측하지 마세요.

JSON만 반환하세요.
{
  "title": "자격명/시험명/수상명/교육명",
  "grade": "등급/점수/상태",
  "issuer": "발급기관/주최기관/교육기관",
  "acquiredAt": "취득일자/수료일자/수상일자",
  "detail": "짧은 설명",
  "ocrText": "읽힌 주요 원문"
}
`.trim();
  if (!gemini) {
    return {
      item: {
        title: "",
        grade: "",
        issuer: "",
        acquiredAt: "",
        detail: "",
        ocrText: "",
      },
      provider: "demo",
    };
  }
  const text = await callGeminiFile(prompt, file);
  return { item: parseJsonObject(text), provider: "gemini" };
}

const interviewQuestionPrompt = ({ application = {}, essay = {}, experiences = [] }) => `
당신은 Wish Port의 Interview 기능입니다. 목적은 많은 질문을 만드는 것이 아니라 기존 Answer Archive로 커버 가능한 질문과 부족한 질문을 분류하는 것입니다.

지원 공고:
- 회사: ${application.company || "미입력"}
- 직무: ${application.role || "미입력"}
- 상태: ${application.status || "미입력"}

자기소개서:
${(essay.questions || [])
  .map((question, index) => `Q${index + 1}. ${question.prompt}\n초안: ${question.draft || "미작성"}`)
  .join("\n\n") || "미작성"}

Archive 경험:
${experiences
  .slice(0, 8)
  .map(
    (item) => `- ${item.title}: ${item.summary || item.evidence || ""}
  STAR: ${item.star?.situation || ""} / ${item.star?.task || ""} / ${item.star?.action || ""} / ${item.star?.result || ""}`,
  )
  .join("\n") || "없음"}

JSON만 반환하세요. 코드블록 금지.
{
  "questions": [
    {
      "questionText": "면접 질문",
      "questionType": "COMMON|ARCHIVE|ESSAY|JOB|TECHNICAL|CHALLENGE|FOLLOW_UP",
      "competencyId": "communication|collaboration|problem_solving|ownership|leadership|adaptability|technical_depth|job_understanding|motivation|responsibility|conflict_resolution|learning",
      "questionClusterId": "self_intro|motivation|job_choice|strength|weakness|collaboration|conflict|responsibility|initiative|problem_solving|failure|challenge|adaptability|feedback|representative_project|job_competency|future_goal",
      "sourceType": "COMMON|ARCHIVE|ESSAY|JOB|TECHNICAL|CHALLENGE|FOLLOW_UP",
      "sourceId": "관련 id 또는 빈 문자열",
      "difficulty": "standard",
      "feedback": {
        "missing": "보완이 필요한 정보",
        "followupNeeded": true
      }
    }
  ]
}

규칙:
- 질문은 10~12개.
- COMMON, ARCHIVE, ESSAY, JOB, TECHNICAL, CHALLENGE를 모두 최소 1개 포함.
- Archive 기반 질문은 프로젝트명만 바꾸는 수준을 피하고 Material/Result/Skill/Weak 정보까지 검증.
- 공격적인 압박 질문 대신 Challenge Mode 관점으로 작성.
- 사용자가 말하지 않은 사실은 만들지 않음.
`.trim();

function mockInterviewQuestions({ application = {}, essay = {}, experiences = [] }) {
  const first = experiences[0];
  const second = experiences[1] || first;
  return {
    questions: [
      {
        questionText: "본인을 1분 안에 소개해주세요.",
        questionType: "COMMON",
        competencyId: "communication",
        questionClusterId: "self_intro",
        sourceType: "COMMON",
        sourceId: "",
        difficulty: "standard",
        feedback: { missing: "핵심 메시지와 대표 경험 연결이 필요합니다.", followupNeeded: true },
      },
      {
        questionText: `${application.company || "지원 기업"} ${application.role || "지원 직무"}에 지원한 이유를 설명해주세요.`,
        questionType: "JOB",
        competencyId: "motivation",
        questionClusterId: "motivation",
        sourceType: "JOB",
        sourceId: application.id || "",
        difficulty: "standard",
        feedback: { missing: "회사/직무 이해와 개인 경험 연결을 보완해야 합니다.", followupNeeded: true },
      },
      {
        questionText: `${first?.title || "대표 경험"}에서 가장 어려웠던 문제를 어떻게 해결했나요?`,
        questionType: "ARCHIVE",
        competencyId: "problem_solving",
        questionClusterId: "problem_solving",
        sourceType: "ARCHIVE",
        sourceId: first?.id || "",
        difficulty: "standard",
        feedback: { missing: "행동의 판단 기준과 결과 기준을 더 구체화해야 합니다.", followupNeeded: true },
      },
      {
        questionText: `${first?.title || "대표 경험"}의 성과가 본인의 기여라고 볼 수 있는 근거는 무엇인가요?`,
        questionType: "CHALLENGE",
        competencyId: "ownership",
        questionClusterId: "responsibility",
        sourceType: "ARCHIVE",
        sourceId: first?.id || "",
        difficulty: "standard",
        feedback: { missing: "본인의 역할 범위와 의사결정 책임을 보완해야 합니다.", followupNeeded: true },
      },
      {
        questionText: essay.questions?.[0]?.draft
          ? "자기소개서에서 언급한 핵심 행동을 더 구체적으로 설명해주세요."
          : "제출할 자기소개서 문항과 연결되는 답변 근거를 설명해주세요.",
        questionType: "ESSAY",
        competencyId: "communication",
        questionClusterId: "representative_project",
        sourceType: "ESSAY",
        sourceId: essay.questions?.[0]?.id || essay.id || "",
        difficulty: "standard",
        feedback: { missing: "자소서 문장과 Archive 근거의 연결을 확인해야 합니다.", followupNeeded: true },
      },
      {
        questionText: `${application.role || "지원 직무"}에서 필요한 핵심 역량을 본인의 경험과 연결해 설명해주세요.`,
        questionType: "TECHNICAL",
        competencyId: "technical_depth",
        questionClusterId: "job_competency",
        sourceType: "TECHNICAL",
        sourceId: application.id || "",
        difficulty: "standard",
        feedback: { missing: "직무 기술/역량의 선택 이유가 부족합니다.", followupNeeded: true },
      },
      {
        questionText: `${second?.title || "협업 경험"}에서 팀원과 의견이 달랐던 상황은 어떻게 정리했나요?`,
        questionType: "ARCHIVE",
        competencyId: "conflict_resolution",
        questionClusterId: "conflict",
        sourceType: "ARCHIVE",
        sourceId: second?.id || "",
        difficulty: "standard",
        feedback: { missing: "상대방 반응과 합의 과정의 구체성이 필요합니다.", followupNeeded: true },
      },
    ],
  };
}

async function generateInterviewQuestions(payload) {
  const prompt = interviewQuestionPrompt(payload);
  if (gemini) {
    const text = await callGeminiText(prompt);
    return { ...parseJsonObject(text), provider: "gemini" };
  }
  if (process.env.OPENAI_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: prompt, max_output_tokens: 1600 }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`OpenAI API ${response.status}`);
      const result = await response.json();
      const text = result.output_text || result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
      return { ...parseJsonObject(text), provider: "openai" };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ...mockInterviewQuestions(payload), provider: "demo" };
}

const interviewCoachingPrompt = ({ questionText = "", answerText = "", history = [], experiences = [] }) => `
당신은 베테랑 면접관이자 면접 코치입니다. 지원자가 방금 한 답변을 면접관 입장에서 냉정하지만 건설적으로 평가하세요.

지금까지의 대화:
${history
  .map((item) => `${item.role === "interviewer" ? "면접관" : "지원자"}: ${item.text}`)
  .join("\n") || "없음"}

방금 지원자가 답변한 질문: ${questionText || "(대화 맥락 참고)"}
지원자의 답변: ${answerText}

참고할 Archive 경험:
${experiences
  .slice(0, 5)
  .map((item) => `- ${item.title}: ${item.summary || item.evidence || ""}`)
  .join("\n") || "없음"}

JSON만 반환하세요. 코드블록 금지.
{
  "score": 0에서 100 사이 정수,
  "summary": "면접관이 이 답변을 들었을 때 드는 전반적인 인상 한두 문장",
  "strengths": ["잘한 점 1", "잘한 점 2"],
  "improvements": ["보완하면 좋은 점 1", "보완하면 좋은 점 2"],
  "emphasize": ["다음에 강조하면 좋은 포인트 1", "포인트 2"],
  "modelAnswer": "같은 질문에 대한 AI의 모범 답변 예시 (2~4문장)",
  "followups": ["면접관이 이어서 물어볼 만한 꼬리질문 1", "꼬리질문 2", "꼬리질문 3"]
}

규칙:
- score는 구체성, 논리 구조(상황-행동-결과), 진정성을 기준으로 평가.
- strengths/improvements/emphasize는 각각 1~3개.
- followups는 정확히 2~3개, 실제 면접관이 물을 법한 자연스러운 질문.
- 지원자가 말하지 않은 사실을 지어내지 않음.
`.trim();

function mockInterviewCoaching({ answerText = "" }) {
  const length = answerText.trim().length;
  const score = Math.max(35, Math.min(92, 40 + Math.round(length / 4)));
  return {
    score,
    summary:
      length > 80
        ? "구체적인 상황과 행동이 잘 드러나 있어 설득력이 있습니다."
        : "핵심 메시지는 전달되지만 구체적인 상황·행동·결과가 조금 더 필요합니다.",
    strengths: ["답변의 핵심 메시지가 명확합니다.", "질문의 의도에 맞게 답변했습니다."],
    improvements: [
      length > 80
        ? "수치나 결과를 한 가지만 더 넣으면 더 좋아집니다."
        : "구체적인 상황(when/where)과 결과를 추가해 보세요.",
    ],
    emphasize: ["본인의 역할과 판단 기준을 강조해 보세요."],
    modelAnswer: `${answerText.slice(0, 40) || "해당 경험"}을 바탕으로, 당시 상황과 제 역할, 구체적인 행동, 그리고 정량적인 결과를 순서대로 말씀드리면 더 설득력 있는 답변이 됩니다.`,
    followups: [
      "그 과정에서 가장 어려웠던 점은 무엇이었나요?",
      "다시 같은 상황이 온다면 무엇을 다르게 하시겠어요?",
      "그 결과를 팀 전체의 성과와 어떻게 연결 지을 수 있을까요?",
    ],
  };
}

function normalizeCoaching(raw = {}, answerText = "") {
  const clampScore = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
  const asList = (value) =>
    Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
  return {
    score: clampScore || mockInterviewCoaching({ answerText }).score,
    summary: String(raw.summary || "").trim() || "답변을 검토했습니다.",
    strengths: asList(raw.strengths).slice(0, 3),
    improvements: asList(raw.improvements).slice(0, 3),
    emphasize: asList(raw.emphasize).slice(0, 3),
    modelAnswer: String(raw.modelAnswer || "").trim(),
    followups: asList(raw.followups).slice(0, 3),
  };
}

async function generateInterviewCoaching(payload) {
  const prompt = interviewCoachingPrompt(payload);
  if (gemini) {
    const text = await callGeminiText(prompt);
    return { coaching: normalizeCoaching(parseJsonObject(text), payload.answerText), provider: "gemini" };
  }
  if (process.env.OPENAI_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: prompt, max_output_tokens: 900 }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`OpenAI API ${response.status}`);
      const result = await response.json();
      const text = result.output_text || result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
      return { coaching: normalizeCoaching(parseJsonObject(text), payload.answerText), provider: "openai" };
    } finally {
      clearTimeout(timer);
    }
  }
  return { coaching: mockInterviewCoaching(payload), provider: "demo" };
}

async function callOpenAI(payload) {
  if (gemini) {
    const text = await callGeminiText(llmPrompt(payload));
    return { text, demo: false, provider: "gemini" };
  }
  if (!process.env.OPENAI_API_KEY) return { text: mockEssay(payload), demo: true, provider: "demo" };
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
    return { text, demo: false, provider: "openai" };
  } finally {
    clearTimeout(timer);
  }
}

const readSupabaseUser = async (req) => {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.startsWith("Bearer ") || !process.env.SUPABASE_URL) return null;
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "",
        Authorization: authorization,
      },
    });
    if (!response.ok) return null;
    const profile = await response.json();
    const user = { id: profile.id, name: profile.user_metadata?.full_name || profile.user_metadata?.name || profile.email, email: profile.email || "", picture: profile.user_metadata?.avatar_url || "" };
    if (process.env.SUPABASE_SECRET_KEY) {
      fetch(`${process.env.SUPABASE_URL}/rest/v1/user_profiles?on_conflict=id`, {
        method: "POST",
        headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ id: user.id, email: user.email, display_name: user.name, avatar_url: user.picture, updated_at: new Date().toISOString() }),
      }).catch(() => {});
    }
    return user;
  } catch { return null; }
};

const requireUser = async (req, res) => {
  const supabaseUser = await readSupabaseUser(req);
  if (supabaseUser) { await ensureUserData(supabaseUser); return supabaseUser; }
  const user = readSession(req);
  if (!user) json(res, 401, { error: "로그인이 필요합니다." });
  return user;
};

const notFound = (res, label = "항목") => json(res, 404, { error: `${label}을 찾지 못했습니다.` });

export async function handleApi(req, res, pathname) {
  if (pathname === "/api/config" && req.method === "GET") {
    return json(res, 200, {
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
      llmEnabled: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
      model: process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || "gemini-3.6-flash",
      llmProvider: process.env.GEMINI_API_KEY
        ? "gemini"
        : process.env.OPENAI_API_KEY
          ? "openai"
          : "demo",
      demoAuthEnabled,
    });
  }

  if (pathname === "/api/session" && req.method === "GET") return json(res, 200, { user: readSession(req) });

  if (pathname === "/api/auth/demo" && req.method === "POST") {
    if (!demoAuthEnabled) return json(res, 403, { error: "데모 로그인이 비활성화되어 있습니다." });
    const user = { id: "demo-user", name: "천그루", email: "groo@example.com", picture: "" };
    await ensureUserData(user);
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
    await ensureUserData(user);
    return json(res, 200, { user }, { "Set-Cookie": sessionCookie(signSession(user)) });
  }

  if (pathname === "/api/logout" && req.method === "POST") return json(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });

  const user = await requireUser(req, res);
  if (!user) return;
  const parts = pathname.split("/").filter(Boolean);

  if (pathname === "/api/bootstrap" && req.method === "GET") return json(res, 200, await getBootstrap(user));

  if (pathname === "/api/profile" && req.method === "PATCH") {
    return json(res, 200, { profile: await updateProfile(user.id, await readBody(req)) });
  }

  if (pathname === "/api/experiences" && req.method === "POST") {
    const body = await readBody(req);
    if (!String(body.title || "").trim()) return json(res, 400, { error: "경험 이름을 입력해 주세요." });
    return json(res, 201, { experience: await createExperience(user.id, body) });
  }
  if (parts[1] === "experiences" && parts[2] && req.method === "PATCH") {
    const experience = await updateExperience(user.id, parts[2], await readBody(req));
    return experience ? json(res, 200, { experience }) : notFound(res, "경험");
  }
  if (parts[1] === "experiences" && parts[2] && req.method === "DELETE") {
    return await deleteExperience(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res, "경험");
  }

  if (pathname === "/api/archive-items" && req.method === "POST") {
    const body = await readBody(req);
    if (!String(body.title || "").trim()) return json(res, 400, { error: "항목 이름을 입력해 주세요." });
    return json(res, 201, { item: await createArchiveItem(user.id, body) });
  }
  if (parts[1] === "archive-items" && parts[2] && req.method === "PATCH") {
    const item = await updateArchiveItem(user.id, parts[2], await readBody(req));
    return item ? json(res, 200, { item }) : notFound(res);
  }
  if (parts[1] === "archive-items" && parts[2] && req.method === "DELETE") {
    return await deleteArchiveItem(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res);
  }

  if (pathname === "/api/essays" && req.method === "POST") return json(res, 201, { essay: await createEssay(user.id, await readBody(req)) });
  if (parts[1] === "essays" && parts[2] && req.method === "PATCH") {
    const essay = await updateEssay(user.id, parts[2], await readBody(req));
    return essay ? json(res, 200, { essay }) : notFound(res, "자기소개서");
  }
  if (parts[1] === "essays" && parts[2] && req.method === "DELETE") {
    return await deleteEssay(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res, "자기소개서");
  }

  if (parts[1] === "questions" && parts[2] && parts[3] === "context" && req.method === "PUT") {
    const body = await readBody(req);
    const question = await setQuestionExperiences(user.id, parts[2], Array.isArray(body.experienceIds) ? body.experienceIds : []);
    return question ? json(res, 200, { question }) : notFound(res, "문항");
  }
  if (parts[1] === "questions" && parts[2] && req.method === "PATCH") {
    const question = await updateQuestion(user.id, parts[2], await readBody(req));
    return question ? json(res, 200, { question }) : notFound(res, "문항");
  }
  if (parts[1] === "essays" && parts[2] && parts[3] === "questions" && req.method === "POST") {
    try {
      const question = await createQuestion(user.id, parts[2], await readBody(req));
      return question ? json(res, 201, { question }) : notFound(res, "자기소개서");
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }
  if (parts[1] === "questions" && parts[2] && req.method === "DELETE") {
    try {
      return await deleteQuestion(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res, "문항");
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (pathname === "/api/applications" && req.method === "POST") return json(res, 201, { application: await createApplication(user.id, await readBody(req)) });
  if (parts[1] === "applications" && parts[2] && req.method === "PATCH") {
    const application = await updateApplication(user.id, parts[2], await readBody(req));
    return application ? json(res, 200, { application }) : notFound(res, "지원 항목");
  }
  if (parts[1] === "applications" && parts[2] && req.method === "DELETE") {
    return await deleteApplication(user.id, parts[2]) ? json(res, 200, { ok: true }) : notFound(res, "지원 항목");
  }

  if (pathname === "/api/interview/answer-assets" && req.method === "POST") {
    return json(res, 201, { asset: await upsertInterviewAnswerAsset(user.id, await readBody(req)) });
  }
  if (parts[1] === "interview" && parts[2] === "answer-assets" && parts[3] && req.method === "PATCH") {
    const asset = await updateInterviewAnswerAsset(user.id, parts[3], await readBody(req));
    return asset ? json(res, 200, { asset }) : notFound(res, "면접 답변");
  }
  if (pathname === "/api/interview/sets" && req.method === "POST") {
    return json(res, 201, { set: await createInterviewSet(user.id, await readBody(req)) });
  }
  if (parts[1] === "interview" && parts[2] === "sets" && parts[3] && req.method === "DELETE") {
    return await deleteInterviewSet(user.id, parts[3]) ? json(res, 200, { ok: true }) : notFound(res, "Interview Set");
  }
  if (parts[1] === "interview" && parts[2] === "sets" && parts[3] && parts[4] === "reorder" && req.method === "PUT") {
    const body = await readBody(req);
    await reorderInterviewSetQuestions(user.id, parts[3], Array.isArray(body.questionIds) ? body.questionIds : []);
    return json(res, 200, { ok: true });
  }
  if (pathname === "/api/interview/questions" && req.method === "POST") {
    return json(res, 201, { question: await createCustomQuestion(user.id, await readBody(req)) });
  }
  if (parts[1] === "interview" && parts[2] === "questions" && parts[3] && req.method === "PATCH") {
    const question = await updateInterviewQuestionAnswer(user.id, parts[3], await readBody(req));
    return question ? json(res, 200, { question }) : notFound(res, "면접 질문");
  }
  if (parts[1] === "interview" && parts[2] === "questions" && parts[3] && req.method === "DELETE") {
    return await deleteInterviewQuestion(user.id, parts[3]) ? json(res, 200, { ok: true }) : notFound(res, "면접 질문");
  }
  if (parts[1] === "interview" && parts[2] === "weak-spots" && parts[3] && parts[4] === "archive-item" && req.method === "POST") {
    const item = await createInterviewWeakSpotArchiveItem(user.id, parts[3]);
    return item ? json(res, 201, { item }) : notFound(res, "면접 Weak Spot");
  }

  if (pathname === "/api/llm/interview-questions" && req.method === "POST") {
    if (!allowRequest(req)) return json(res, 429, { error: "잠시 후 다시 시도해 주세요." });
    try {
      return json(res, 200, await generateInterviewQuestions(await readBody(req)));
    } catch (error) {
      return json(res, 502, { error: error.name === "AbortError" ? "AI 응답 시간이 초과되었습니다." : "면접 질문을 생성하지 못했습니다." });
    }
  }

  if (pathname === "/api/llm/interview-coaching" && req.method === "POST") {
    if (!allowRequest(req)) return json(res, 429, { error: "잠시 후 다시 시도해 주세요." });
    try {
      return json(res, 200, await generateInterviewCoaching(await readBody(req)));
    } catch (error) {
      return json(res, 502, { error: error.name === "AbortError" ? "AI 응답 시간이 초과되었습니다." : "AI 코칭을 생성하지 못했습니다." });
    }
  }

  if (pathname === "/api/llm/archive-experience" && req.method === "POST") {
    if (!allowRequest(req)) return json(res, 429, { error: "잠시 후 다시 시도해 주세요." });
    const body = await readBody(req);
    try {
      const result = await structureArchiveExperience(body.answers || {});
      return json(res, 200, result);
    } catch (error) {
      return json(res, 502, { error: error.name === "AbortError" ? "AI 응답 시간이 초과되었습니다." : "경험을 구조화하지 못했습니다." });
    }
  }

  if (pathname === "/api/llm/archive-item-file" && req.method === "POST") {
    if (!allowRequest(req)) return json(res, 429, { error: "잠시 후 다시 시도해 주세요." });
    const body = await readBody(req);
    try {
      const result = await extractArchiveItemFromFile(body.file || {}, body.kind);
      return json(res, 200, result);
    } catch (error) {
      return json(res, 502, { error: error.name === "AbortError" ? "AI 응답 시간이 초과되었습니다." : "첨부파일에서 정보를 읽지 못했습니다." });
    }
  }

  if (pathname === "/api/llm/essay" && req.method === "POST") {
    if (!allowRequest(req)) return json(res, 429, { error: "잠시 후 다시 시도해 주세요." });
    const body = await readBody(req);
    const context = await getQuestionContext(user.id, body.questionId);
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
      const question = await saveGeneratedDraft(user.id, body.questionId, result.text);
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
