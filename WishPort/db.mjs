import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = fileURLToPath(new URL(".", import.meta.url));
const databasePath = process.env.WISHPORT_DB_PATH || join(root, "data", "wishport.db");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    school TEXT NOT NULL DEFAULT '',
    major TEXT NOT NULL DEFAULT '',
    gpa TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    github TEXT NOT NULL DEFAULT '',
    education_period TEXT NOT NULL DEFAULT '',
    career_title TEXT NOT NULL DEFAULT '',
    career_period TEXT NOT NULL DEFAULT '',
    career_summary TEXT NOT NULL DEFAULT '',
    photo_data TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS experiences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    meta TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    evidence TEXT NOT NULL DEFAULT '',
    star_situation TEXT NOT NULL DEFAULT '',
    star_task TEXT NOT NULL DEFAULT '',
    star_action TEXT NOT NULL DEFAULT '',
    star_result TEXT NOT NULL DEFAULT '',
    chips_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS archive_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('achievement', 'asset')),
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    tone TEXT NOT NULL DEFAULT 'mint',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    submitted_at TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '지원 예정',
    essay_id TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS essays (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '작성 중',
    current_step INTEGER NOT NULL DEFAULT 0,
    max_step INTEGER NOT NULL DEFAULT 0,
    active_question INTEGER NOT NULL DEFAULT 0,
    source_url TEXT NOT NULL DEFAULT '',
    source_text TEXT NOT NULL DEFAULT '',
    source_file TEXT NOT NULL DEFAULT '',
    job_post_url TEXT NOT NULL DEFAULT '',
    job_post_file TEXT NOT NULL DEFAULT '',
    jd_url TEXT NOT NULL DEFAULT '',
    jd_file TEXT NOT NULL DEFAULT '',
    blind_mode INTEGER NOT NULL DEFAULT 1,
    ai_rules TEXT NOT NULL DEFAULT '',
    reference_file TEXT NOT NULL DEFAULT '',
    reference_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS essay_questions (
    id TEXT PRIMARY KEY,
    essay_id TEXT NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    char_limit INTEGER NOT NULL DEFAULT 600,
    theme TEXT NOT NULL DEFAULT '',
    draft TEXT NOT NULL DEFAULT '',
    feedback TEXT NOT NULL DEFAULT '',
    annotations_json TEXT NOT NULL DEFAULT '[]',
    needs_regeneration INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE (essay_id, position)
  );

  CREATE TABLE IF NOT EXISTS question_experiences (
    question_id TEXT NOT NULL REFERENCES essay_questions(id) ON DELETE CASCADE,
    experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (question_id, experience_id)
  );

  CREATE INDEX IF NOT EXISTS idx_experiences_user ON experiences(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_archive_items_user ON archive_items(user_id, kind, position);
  CREATE INDEX IF NOT EXISTS idx_essays_user ON essays(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_questions_essay ON essay_questions(essay_id, position);
  CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id, updated_at DESC);
`);

function ensureColumn(table, name, definition) {
  const exists = db.prepare("PRAGMA table_info(" + table + ")").all().some((column) => column.name === name);
  if (!exists) db.exec("ALTER TABLE " + table + " ADD COLUMN " + name + " " + definition);
}

[
  ["profiles", "location", "TEXT NOT NULL DEFAULT ''"],
  ["profiles", "website", "TEXT NOT NULL DEFAULT ''"],
  ["profiles", "github", "TEXT NOT NULL DEFAULT ''"],
  ["profiles", "education_period", "TEXT NOT NULL DEFAULT ''"],
  ["profiles", "career_title", "TEXT NOT NULL DEFAULT ''"],
  ["profiles", "career_period", "TEXT NOT NULL DEFAULT ''"],
  ["profiles", "career_summary", "TEXT NOT NULL DEFAULT ''"],
  ["profiles", "photo_data", "TEXT NOT NULL DEFAULT ''"],
  ["experiences", "star_situation", "TEXT NOT NULL DEFAULT ''"],
  ["experiences", "star_task", "TEXT NOT NULL DEFAULT ''"],
  ["experiences", "star_action", "TEXT NOT NULL DEFAULT ''"],
  ["experiences", "star_result", "TEXT NOT NULL DEFAULT ''"],
  ["essays", "job_post_url", "TEXT NOT NULL DEFAULT ''"],
  ["essays", "job_post_file", "TEXT NOT NULL DEFAULT ''"],
  ["essays", "jd_url", "TEXT NOT NULL DEFAULT ''"],
  ["essays", "jd_file", "TEXT NOT NULL DEFAULT ''"],
  ["essays", "blind_mode", "INTEGER NOT NULL DEFAULT 1"],
  ["essays", "ai_rules", "TEXT NOT NULL DEFAULT ''"],
  ["essays", "reference_file", "TEXT NOT NULL DEFAULT ''"],
  ["essays", "reference_text", "TEXT NOT NULL DEFAULT ''"],
  ["essay_questions", "annotations_json", "TEXT NOT NULL DEFAULT '[]'"],
].forEach(([table, name, definition]) => ensureColumn(table, name, definition));

const legacyDemoDraft = "저는 프로젝트에서 역할과 작업 순서를 다시 설계해 팀의 실행력을 높였습니다. Erooming 프로젝트에서 초기 업무 경계가 모호해 일정이 밀리는 문제를 발견했고, 작업 의존 관계와 팀원의 강점을 기준으로 역할을 재배분했습니다. 주간 목표를 실행 항목으로 세분화하고 회의 결정 사항을 즉시 공유해 모두가 같은 우선순위를 확인하도록 했습니다. 그 결과 핵심 기능을 계획한 일정 안에 완성했습니다.";
const starDemoDraft = "[역할 재설계로 일정을 회복한 협업]\n\nErooming 프로젝트에서는 업무 경계가 모호해 핵심 기능 일정이 지연되고 있었습니다. 제가 해결해야 할 과제는 팀원의 강점을 살리면서 정해진 일정 안에 MVP를 완성하는 것이었습니다. 먼저 작업 의존 관계를 정리하고 담당자의 강점을 기준으로 역할을 재배분했습니다. 이어 주간 목표를 실행 항목으로 나누고 회의에서 결정한 내용을 담당자와 기한이 있는 할 일로 즉시 공유했습니다. 그 결과 팀이 같은 우선순위로 움직이며 핵심 기능을 계획한 일정 안에 완성했고, 이후 변경 요청에도 책임 범위와 영향을 빠르게 판단할 수 있었습니다.";
db.prepare("UPDATE essay_questions SET draft = ?, updated_at = ? WHERE id LIKE ? AND draft = ?")
  .run(starDemoDraft, new Date().toISOString(), "%:kpx-essay:q2", legacyDemoDraft);

const now = () => new Date().toISOString();
const jsonParse = (value, fallback = []) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

export const DEMO_DATA = {
  profile: {
    name: "천그루",
    role: "Product · AI · Frontend",
    email: "groo@example.com",
    phone: "010-0000-0000",
    school: "한동대학교",
    major: "ICT융합전공 · 전자공학",
    gpa: "3.8 / 4.5",
    location: "Seoul, Korea",
    website: "wishport.dev/groo",
    github: "github.com/CheonGroo",
    educationPeriod: "2022.03 - 2026.02",
    careerTitle: "AI Product Intern",
    careerPeriod: "2025.06 - 2025.08",
    careerSummary: "사용자 인터뷰와 RAG 기반 서비스 프로토타입 제작을 담당했습니다.",
  },
  experiences: [
    {
      id: "erooming",
      title: "Erooming",
      meta: "PM · Frontend · Team Project",
      summary: "회의실 예약 서비스를 기획하고 PM으로 일정·태스크·협업 방식을 운영한 프로젝트.",
      evidence: "팀의 강점과 작업 의존 관계를 기준으로 역할을 재배분하고, 주간 목표를 실행 항목으로 세분화했다.",
      star: { situation: "업무 경계가 모호해 핵심 기능 일정이 지연되고 있었습니다.", task: "팀의 강점을 살리면서 일정 안에 MVP를 완성해야 했습니다.", action: "작업 의존 관계를 정리하고 역할을 재배분한 뒤 주간 목표를 실행 항목으로 나눴습니다.", result: "핵심 기능을 계획한 일정 안에 완성하고 변경 대응 시간을 줄였습니다." },
      chips: [["역할 재배분", "material"], ["일정 내 완료", "result"], ["협업", "skill"], ["Web Service", "output"]],
    },
    {
      id: "local-gpt",
      title: "Local GPT",
      meta: "Capstone · Solo",
      summary: "기업 내부 문서 기반 로컬 LLM 서비스의 접근 방향을 검증하고 한계를 정리한 프로젝트.",
      evidence: "형태소 분석 중심 접근이 목표와 맞지 않는다는 점을 확인하고 검색 구조와 평가 기준을 다시 설계했다.",
      star: { situation: "초기 검색 방식이 기업 문서 질의에서 일관된 근거를 찾지 못했습니다.", task: "실패 원인을 설명하고 검증 가능한 대안을 만들어야 했습니다.", action: "검색 로그를 분류하고 hybrid retrieval과 평가 기준을 다시 설계했습니다.", result: "접근 한계와 후속 구현 방향을 결과보고서로 정리했습니다." },
      chips: [["접근 방향 재검토", "material"], ["실패 원인 정리", "result"], ["문제정의", "skill"], ["결과보고서", "output"]],
    },
    {
      id: "demand",
      title: "인도네시아 수요예측",
      meta: "ML · Business Analysis",
      summary: "판매 데이터를 분석하고 수요 패턴을 비즈니스 의사결정과 연결한 머신러닝 프로젝트.",
      evidence: "판매량 변화와 시간대별 패턴을 시각화해 운영 의사결정에 활용할 수 있는 관찰을 정리했다.",
      star: { situation: "지역별 판매 데이터의 변동이 커서 단순 평균으로 수요를 설명하기 어려웠습니다.", task: "운영에 활용할 수 있는 반복 패턴을 찾아야 했습니다.", action: "시간대와 품목별 변화를 시각화하고 이상치를 분리해 비교했습니다.", result: "재고 운영에 활용 가능한 수요 패턴과 관찰을 보고서로 제시했습니다." },
      chips: [["수요 패턴 분석", "material"], ["비즈니스 인사이트", "result"], ["EDA", "skill"], ["분석 보고서", "output"]],
    },
    {
      id: "eemd",
      title: "EEMD + LSTM",
      meta: "Research · Demand Forecast",
      summary: "디컴포지션과 딥러닝을 결합해 수요예측 모델의 성능을 개선하고 학술대회에서 발표.",
      evidence: "EEMD로 시계열 성분을 분리하고 LSTM 입력을 재구성해 기준 모델과 성능을 비교했다.",
      star: { situation: "비정상 시계열 때문에 기준 LSTM의 예측 오차가 크게 변했습니다.", task: "변동 성분을 분리해 모델 안정성을 개선해야 했습니다.", action: "EEMD로 성분을 분해한 뒤 LSTM 입력을 재구성하고 동일 조건에서 비교했습니다.", result: "기준 모델 대비 개선 결과를 검증해 학술대회에서 발표했습니다." },
      chips: [["모델 결합 설계", "material"], ["예측 성능 개선", "result"], ["모델링", "skill"], ["학술 발표", "output"]],
    },
    {
      id: "library-ux",
      title: "포항시립도서관 UX 개선",
      meta: "HCI · UX Research",
      summary: "아이트래커 히트맵과 정량적 사용성 평가를 활용해 모바일 웹 인터페이스를 개선.",
      evidence: "시선 이동과 과업 성공률을 함께 분석해 정보 탐색을 방해하는 UI 요소를 특정했다.",
      star: { situation: "모바일 웹에서 원하는 도서를 찾는 과정의 이탈이 많았습니다.", task: "탐색을 방해하는 구체적인 UI 원인을 찾아야 했습니다.", action: "아이트래커 히트맵과 과업 성공률을 함께 분석했습니다.", result: "우선순위가 있는 UI 개선안과 검증 지표를 제안했습니다." },
      chips: [["아이트래커 분석", "material"], ["UI 개선안", "result"], ["UX Research", "skill"], ["발표 자료", "output"]],
    },
    {
      id: "giving-tree",
      title: "GivingTree",
      meta: "Frontend · Collaboration",
      summary: "의류 기부 플랫폼을 제작하며 시각적 완성도와 협업 방식의 중요성을 경험.",
      evidence: "공통 컴포넌트와 화면별 책임을 정리해 팀의 프론트엔드 작업 충돌을 줄였다.",
      star: { situation: "여러 명이 동시에 화면을 구현하면서 컴포넌트 충돌이 반복됐습니다.", task: "개발 속도를 유지하면서 화면 일관성을 확보해야 했습니다.", action: "공통 컴포넌트와 화면별 책임, 병합 순서를 문서화했습니다.", result: "프론트엔드 충돌을 줄이고 핵심 화면을 일정 내 통합했습니다." },
      chips: [["프론트 UI 구현", "material"], ["협업 흐름 경험", "result"], ["Frontend", "skill"], ["웹사이트", "output"]],
    },
  ],
  archiveItems: [
    { kind: "achievement", title: "교내 캡스톤 우수상", detail: "Local GPT · 2025", tone: "sky" },
    { kind: "achievement", title: "ADsP", detail: "한국데이터산업진흥원", tone: "mint" },
    { kind: "asset", title: "React · JavaScript · Python", detail: "개발 스킬", tone: "mint" },
    { kind: "asset", title: "포트폴리오", detail: "wishport.dev/groo", tone: "lilac" },
  ],
  essay: {
    id: "kpx-essay",
    company: "한국전력거래소",
    role: "IT",
    status: "작성 중",
    currentStep: 2,
    maxStep: 2,
    activeQuestion: 1,
    sourceUrl: "https://jobs.example.com/kpx-it",
    sourceText: "전력시장과 전력계통 운영을 지원하는 IT 서비스 기획 및 개발 직무",
    sourceFile: "KPX_IT_직무기술서.pdf",
    jobPostFile: "KPX_채용공고.pdf",
    jobDescriptionUrl: "https://jobs.example.com/kpx-it-description",
    blindMode: true,
    aiRules: "과장된 표현을 피하고, 행동과 결과를 구체적으로 작성합니다.",
    referenceFile: "천그루_기존자소서.pdf",
    referenceText: "짧은 문장과 담백한 어조를 유지합니다.",
    questions: [
      { prompt: "지원 동기와 입사 후 목표를 작성해 주세요.", theme: "지원동기", experienceIds: ["local-gpt"] },
      { prompt: "협업 과정에서 문제를 해결한 경험을 작성해 주세요.", theme: "협업 · 문제해결", experienceIds: ["erooming", "giving-tree"], draft: "[역할 재설계로 일정을 회복한 협업]\n\nErooming 프로젝트에서는 업무 경계가 모호해 핵심 기능 일정이 지연되고 있었습니다. 제가 해결해야 할 과제는 팀원의 강점을 살리면서 정해진 일정 안에 MVP를 완성하는 것이었습니다. 먼저 작업 의존 관계를 정리하고 담당자의 강점을 기준으로 역할을 재배분했습니다. 이어 주간 목표를 실행 항목으로 나누고 회의에서 결정한 내용을 담당자와 기한이 있는 할 일로 즉시 공유했습니다. 그 결과 팀이 같은 우선순위로 움직이며 핵심 기능을 계획한 일정 안에 완성했고, 이후 변경 요청에도 책임 범위와 영향을 빠르게 판단할 수 있었습니다." },
      { prompt: "직무 역량을 키우기 위해 노력한 경험을 작성해 주세요.", theme: "직무역량", experienceIds: ["eemd", "demand"] },
    ],
  },
};

function transaction(callback) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function ensureUserData(user) {
  const existing = db.prepare("SELECT user_id FROM profiles WHERE user_id = ?").get(user.id);
  if (existing) return;
  const stamp = now();
  transaction(() => {
    const profile = { ...DEMO_DATA.profile, name: user.name || DEMO_DATA.profile.name, email: user.email || DEMO_DATA.profile.email };
    db.prepare(`INSERT INTO profiles
      (user_id, name, role, email, phone, school, major, gpa, location, website, github, education_period, career_title, career_period, career_summary, photo_data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        user.id, profile.name, profile.role, profile.email, profile.phone, profile.school, profile.major, profile.gpa,
        profile.location, profile.website, profile.github, profile.educationPeriod, profile.careerTitle, profile.careerPeriod, profile.careerSummary, "", stamp,
      );

    const experienceStatement = db.prepare(`INSERT INTO experiences
      (id, user_id, title, meta, summary, evidence, star_situation, star_task, star_action, star_result, chips_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of DEMO_DATA.experiences) {
      experienceStatement.run(
        `${user.id}:${item.id}`, user.id, item.title, item.meta, item.summary, item.evidence,
        item.star.situation, item.star.task, item.star.action, item.star.result, JSON.stringify(item.chips), stamp, stamp,
      );
    }

    const archiveStatement = db.prepare(`INSERT INTO archive_items
      (id, user_id, kind, title, detail, tone, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    DEMO_DATA.archiveItems.forEach((item, index) => archiveStatement.run(randomUUID(), user.id, item.kind, item.title, item.detail, item.tone, index, stamp, stamp));

    const essayId = `${user.id}:${DEMO_DATA.essay.id}`;
    const essay = DEMO_DATA.essay;
    db.prepare(`INSERT INTO essays
      (id, user_id, company, role, status, current_step, max_step, active_question, source_url, source_text, source_file,
       job_post_url, job_post_file, jd_url, jd_file, blind_mode, ai_rules, reference_file, reference_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        essayId, user.id, essay.company, essay.role, essay.status, essay.currentStep, essay.maxStep, essay.activeQuestion,
        essay.sourceUrl, essay.sourceText, essay.sourceFile, essay.sourceUrl, essay.jobPostFile, essay.jobDescriptionUrl,
        essay.sourceFile, Number(essay.blindMode), essay.aiRules, essay.referenceFile, essay.referenceText, stamp, stamp,
      );
    const questionStatement = db.prepare(`INSERT INTO essay_questions
      (id, essay_id, position, prompt, char_limit, theme, draft, feedback, needs_regeneration, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`);
    const linkStatement = db.prepare("INSERT INTO question_experiences (question_id, experience_id, position) VALUES (?, ?, ?)");
    essay.questions.forEach((question, index) => {
      const questionId = `${essayId}:q${index + 1}`;
      questionStatement.run(questionId, essayId, index, question.prompt, 600, question.theme, question.draft || "", "", stamp);
      question.experienceIds.forEach((experienceId, position) => linkStatement.run(questionId, `${user.id}:${experienceId}`, position));
    });

    const applicationStatement = db.prepare(`INSERT INTO applications
      (id, user_id, company, role, submitted_at, status, essay_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    applicationStatement.run(`${user.id}:kpx-application`, user.id, essay.company, essay.role, "", "지원 예정", essayId, stamp);
    applicationStatement.run(randomUUID(), user.id, "Data Nest", "Data Analyst", "2026.08.26", "제출", null, stamp);
    applicationStatement.run(randomUUID(), user.id, "Design Lab", "UX Engineer", "2026.08.18", "면접", null, stamp);
  });
}

const mapExperience = (row) => ({
  id: row.id,
  title: row.title,
  meta: row.meta,
  summary: row.summary,
  evidence: row.evidence,
  star: {
    situation: row.star_situation || "",
    task: row.star_task || "",
    action: row.star_action || "",
    result: row.star_result || "",
  },
  chips: jsonParse(row.chips_json),
  createdAt: row.created_at || row.createdAt,
  updatedAt: row.updated_at || row.updatedAt,
});
const mapArchiveItem = (row) => row;
const mapQuestion = (row) => ({
  id: row.id,
  position: row.position,
  prompt: row.prompt,
  charLimit: row.char_limit,
  theme: row.theme,
  draft: row.draft,
  feedback: row.feedback,
  annotations: jsonParse(row.annotations_json),
  needsRegeneration: Boolean(row.needs_regeneration),
  updatedAt: row.updated_at,
  selectedExperienceIds: db.prepare("SELECT experience_id FROM question_experiences WHERE question_id = ? ORDER BY position").all(row.id).map((item) => item.experience_id),
});

export function getEssay(userId, essayId) {
  const row = db.prepare("SELECT * FROM essays WHERE id = ? AND user_id = ?").get(essayId, userId);
  if (!row) return null;
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status,
    currentStep: row.current_step,
    maxStep: row.max_step,
    activeQuestion: row.active_question,
    sources: {
      jobPost: { url: row.job_post_url || row.source_url, file: row.job_post_file || "" },
      jobDescription: { url: row.jd_url || "", file: row.jd_file || row.source_file },
    },
    rules: { blindMode: Boolean(row.blind_mode), aiInstructions: row.ai_rules || "" },
    reference: { file: row.reference_file || "", text: row.reference_text || "" },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questions: db.prepare("SELECT * FROM essay_questions WHERE essay_id = ? ORDER BY position").all(row.id).map(mapQuestion),
  };
}

export function getBootstrap(user) {
  ensureUserData(user);
  const userId = user.id;
  const profileRow = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId);
  const profile = {
    name: profileRow.name, role: profileRow.role, email: profileRow.email, phone: profileRow.phone,
    school: profileRow.school, major: profileRow.major, gpa: profileRow.gpa, location: profileRow.location,
    website: profileRow.website, github: profileRow.github, educationPeriod: profileRow.education_period,
    careerTitle: profileRow.career_title, careerPeriod: profileRow.career_period, careerSummary: profileRow.career_summary,
    photoData: profileRow.photo_data || "",
    updatedAt: profileRow.updated_at,
  };
  const experiences = db.prepare("SELECT * FROM experiences WHERE user_id = ? ORDER BY updated_at DESC").all(userId).map(mapExperience);
  const archiveItems = db.prepare("SELECT id, kind, title, detail, tone, position, created_at AS createdAt, updated_at AS updatedAt FROM archive_items WHERE user_id = ? ORDER BY kind, position, created_at").all(userId).map(mapArchiveItem);
  const essays = db.prepare("SELECT id FROM essays WHERE user_id = ? ORDER BY updated_at DESC").all(userId).map((row) => getEssay(userId, row.id));
  const applications = db.prepare(`SELECT a.id, a.company, a.role, a.submitted_at AS submittedAt, a.status, a.essay_id AS essayId,
    a.updated_at AS updatedAt, e.status AS essayStatus FROM applications a LEFT JOIN essays e ON e.id = a.essay_id
    WHERE a.user_id = ? ORDER BY a.updated_at DESC`).all(userId);
  return { profile, experiences, archiveItems, essays, applications };
}

const editableProfileFields = ["name", "role", "email", "phone", "school", "major", "gpa", "location", "website", "github"];
export function updateProfile(userId, patch) {
  const current = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId);
  if (!current) return null;
  const dbKeys = { educationPeriod: "education_period", careerTitle: "career_title", careerPeriod: "career_period", careerSummary: "career_summary", photoData: "photo_data" };
  const keys = [...editableProfileFields, ...Object.keys(dbKeys)];
  const next = Object.fromEntries(keys.map((key) => [key, String(patch[key] ?? current[dbKeys[key] || key] ?? "").trim()]));
  db.prepare(`UPDATE profiles SET name = ?, role = ?, email = ?, phone = ?, school = ?, major = ?, gpa = ?, location = ?, website = ?, github = ?,
    education_period = ?, career_title = ?, career_period = ?, career_summary = ?, photo_data = ?, updated_at = ? WHERE user_id = ?`)
    .run(next.name, next.role, next.email, next.phone, next.school, next.major, next.gpa, next.location, next.website, next.github,
      next.educationPeriod, next.careerTitle, next.careerPeriod, next.careerSummary, next.photoData, now(), userId);
  return getBootstrap({ id: userId, name: next.name, email: next.email }).profile;
}

export function createExperience(userId, payload) {
  const id = randomUUID();
  const stamp = now();
  const star = payload.star || {};
  db.prepare(`INSERT INTO experiences
    (id, user_id, title, meta, summary, evidence, star_situation, star_task, star_action, star_result, chips_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, userId, String(payload.title || "새 경험").trim(), String(payload.meta || "").trim(), String(payload.summary || "").trim(),
      String(payload.evidence || "").trim(), String(star.situation || "").trim(), String(star.task || "").trim(),
      String(star.action || "").trim(), String(star.result || "").trim(), JSON.stringify(Array.isArray(payload.chips) ? payload.chips : []), stamp, stamp,
    );
  return mapExperience(db.prepare("SELECT * FROM experiences WHERE id = ?").get(id));
}

export function updateExperience(userId, id, patch) {
  const current = db.prepare("SELECT * FROM experiences WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;
  const star = patch.star || {};
  db.prepare(`UPDATE experiences SET title = ?, meta = ?, summary = ?, evidence = ?, star_situation = ?, star_task = ?, star_action = ?, star_result = ?,
    chips_json = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
    .run(
      String(patch.title ?? current.title).trim(), String(patch.meta ?? current.meta).trim(), String(patch.summary ?? current.summary).trim(),
      String(patch.evidence ?? current.evidence).trim(), String(star.situation ?? current.star_situation).trim(),
      String(star.task ?? current.star_task).trim(), String(star.action ?? current.star_action).trim(), String(star.result ?? current.star_result).trim(),
      JSON.stringify(Array.isArray(patch.chips) ? patch.chips : jsonParse(current.chips_json)), now(), id, userId,
    );
  return mapExperience(db.prepare("SELECT * FROM experiences WHERE id = ?").get(id));
}

export function deleteExperience(userId, id) {
  return db.prepare("DELETE FROM experiences WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

export function createArchiveItem(userId, payload) {
  const id = randomUUID();
  const stamp = now();
  const kind = payload.kind === "asset" ? "asset" : "achievement";
  const position = db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM archive_items WHERE user_id = ? AND kind = ?").get(userId, kind).next;
  db.prepare(`INSERT INTO archive_items (id, user_id, kind, title, detail, tone, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, kind, String(payload.title || "새 항목").trim(), String(payload.detail || "").trim(), String(payload.tone || (kind === "asset" ? "lilac" : "mint")), position, stamp, stamp);
  return mapArchiveItem(db.prepare("SELECT * FROM archive_items WHERE id = ?").get(id));
}

export function updateArchiveItem(userId, id, patch) {
  const current = db.prepare("SELECT * FROM archive_items WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;
  db.prepare("UPDATE archive_items SET title = ?, detail = ?, tone = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(String(patch.title ?? current.title).trim(), String(patch.detail ?? current.detail).trim(), String(patch.tone ?? current.tone), now(), id, userId);
  return mapArchiveItem(db.prepare("SELECT * FROM archive_items WHERE id = ?").get(id));
}

export function deleteArchiveItem(userId, id) {
  return db.prepare("DELETE FROM archive_items WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

const defaultQuestions = [
  ["지원 동기와 입사 후 목표를 작성해 주세요.", "지원동기"],
  ["협업 과정에서 문제를 해결한 경험을 작성해 주세요.", "협업 · 문제해결"],
  ["직무 역량을 키우기 위해 노력한 경험을 작성해 주세요.", "직무역량"],
];

export function createEssay(userId, payload = {}) {
  const id = randomUUID();
  const stamp = now();
  transaction(() => {
    db.prepare(`INSERT INTO essays
      (id, user_id, company, role, status, current_step, max_step, active_question, source_url, source_text, source_file,
       job_post_url, job_post_file, jd_url, jd_file, blind_mode, ai_rules, reference_file, reference_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, '작성 중', 0, 0, 0, '', '', '', '', '', '', '', 1, '', '', '', ?, ?)`)
      .run(id, userId, String(payload.company || "새 지원").trim(), String(payload.role || "직무 미정").trim(), stamp, stamp);
    const statement = db.prepare(`INSERT INTO essay_questions
      (id, essay_id, position, prompt, char_limit, theme, draft, feedback, needs_regeneration, updated_at)
      VALUES (?, ?, ?, ?, 600, ?, '', '', 0, ?)`);
    defaultQuestions.forEach(([prompt, theme], position) => statement.run(randomUUID(), id, position, prompt, theme, stamp));
    db.prepare(`INSERT INTO applications (id, user_id, company, role, submitted_at, status, essay_id, updated_at)
      VALUES (?, ?, ?, ?, '', '지원 예정', ?, ?)`).run(randomUUID(), userId, String(payload.company || "새 지원").trim(), String(payload.role || "직무 미정").trim(), id, stamp);
  });
  return getEssay(userId, id);
}

export function updateEssay(userId, id, patch) {
  const current = db.prepare("SELECT * FROM essays WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;
  const currentStep = Math.max(0, Math.min(2, Number(patch.currentStep ?? current.current_step)));
  const maxStep = Math.max(current.max_step, Math.max(0, Math.min(3, Number(patch.maxStep ?? current.max_step))));
  const questionCount = db.prepare("SELECT COUNT(*) AS count FROM essay_questions WHERE essay_id = ?").get(id).count;
  const activeQuestion = Math.max(0, Math.min(Math.max(0, questionCount - 1), Number(patch.activeQuestion ?? current.active_question)));
  const sources = patch.sources || {};
  const rules = patch.rules || {};
  const reference = patch.reference || {};
  db.prepare(`UPDATE essays SET company = ?, role = ?, status = ?, current_step = ?, max_step = ?, active_question = ?,
    source_url = ?, source_text = ?, source_file = ?, job_post_url = ?, job_post_file = ?, jd_url = ?, jd_file = ?,
    blind_mode = ?, ai_rules = ?, reference_file = ?, reference_text = ?, updated_at = ? WHERE id = ? AND user_id = ?`).run(
      String(patch.company ?? current.company).trim(), String(patch.role ?? current.role).trim(), String(patch.status ?? current.status),
      currentStep, maxStep, activeQuestion, String(sources.jobPost?.url ?? current.source_url),
      String(current.source_text), String(sources.jobDescription?.file ?? current.source_file),
      String(sources.jobPost?.url ?? current.job_post_url), String(sources.jobPost?.file ?? current.job_post_file),
      String(sources.jobDescription?.url ?? current.jd_url), String(sources.jobDescription?.file ?? current.jd_file),
      Number(rules.blindMode ?? current.blind_mode), String(rules.aiInstructions ?? current.ai_rules),
      String(reference.file ?? current.reference_file), String(reference.text ?? current.reference_text), now(), id, userId,
    );
  if (patch.company !== undefined || patch.role !== undefined) {
    db.prepare("UPDATE applications SET company = ?, role = ?, updated_at = ? WHERE essay_id = ? AND user_id = ?")
      .run(String(patch.company ?? current.company).trim(), String(patch.role ?? current.role).trim(), now(), id, userId);
  }
  if (patch.status === "완료") {
    db.prepare("UPDATE applications SET updated_at = ? WHERE essay_id = ? AND user_id = ?").run(now(), id, userId);
  }
  return getEssay(userId, id);
}

export function deleteEssay(userId, id) {
  return transaction(() => {
    db.prepare("UPDATE applications SET essay_id = NULL, updated_at = ? WHERE essay_id = ? AND user_id = ?").run(now(), id, userId);
    return db.prepare("DELETE FROM essays WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
  });
}

export function updateQuestion(userId, questionId, patch) {
  const current = db.prepare(`SELECT q.* FROM essay_questions q JOIN essays e ON e.id = q.essay_id
    WHERE q.id = ? AND e.user_id = ?`).get(questionId, userId);
  if (!current) return null;
  const promptChanged = patch.prompt !== undefined && String(patch.prompt) !== current.prompt;
  const limit = Math.max(100, Math.min(5000, Number(patch.charLimit ?? current.char_limit) || 600));
  db.prepare(`UPDATE essay_questions SET prompt = ?, char_limit = ?, theme = ?, draft = ?, feedback = ?, annotations_json = ?, needs_regeneration = ?, updated_at = ? WHERE id = ?`)
    .run(String(patch.prompt ?? current.prompt), limit, String(patch.theme ?? current.theme),
      String(patch.draft ?? current.draft), String(patch.feedback ?? current.feedback),
      JSON.stringify(Array.isArray(patch.annotations) ? patch.annotations : jsonParse(current.annotations_json)),
      Number(patch.needsRegeneration ?? (promptChanged ? 1 : current.needs_regeneration)), now(), questionId);
  return mapQuestion(db.prepare("SELECT * FROM essay_questions WHERE id = ?").get(questionId));
}

export function createQuestion(userId, essayId, payload = {}) {
  const essay = db.prepare("SELECT id FROM essays WHERE id = ? AND user_id = ?").get(essayId, userId);
  if (!essay) return null;
  const position = db.prepare("SELECT COUNT(*) AS count FROM essay_questions WHERE essay_id = ?").get(essayId).count;
  if (position >= 8) throw new Error("자기소개서 문항은 최대 8개까지 추가할 수 있습니다.");
  const id = randomUUID();
  const stamp = now();
  db.prepare(`INSERT INTO essay_questions
    (id, essay_id, position, prompt, char_limit, theme, draft, feedback, needs_regeneration, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, '', '', 0, ?)`).run(
      id, essayId, position, String(payload.prompt || "새 자기소개서 문항").trim(),
      Math.max(100, Math.min(5000, Number(payload.charLimit) || 600)), String(payload.theme || "직접 입력"), stamp,
    );
  db.prepare("UPDATE essays SET updated_at = ? WHERE id = ?").run(stamp, essayId);
  return mapQuestion(db.prepare("SELECT * FROM essay_questions WHERE id = ?").get(id));
}

export function deleteQuestion(userId, questionId) {
  const current = db.prepare(`SELECT q.id, q.essay_id, q.position FROM essay_questions q
    JOIN essays e ON e.id = q.essay_id WHERE q.id = ? AND e.user_id = ?`).get(questionId, userId);
  if (!current) return false;
  const count = db.prepare("SELECT COUNT(*) AS count FROM essay_questions WHERE essay_id = ?").get(current.essay_id).count;
  if (count <= 1) throw new Error("자기소개서에는 문항이 하나 이상 필요합니다.");
  transaction(() => {
    db.prepare("DELETE FROM essay_questions WHERE id = ?").run(questionId);
    db.prepare("UPDATE essay_questions SET position = position - 1 WHERE essay_id = ? AND position > ?").run(current.essay_id, current.position);
    db.prepare(`UPDATE essays SET active_question = MIN(active_question, ?), updated_at = ? WHERE id = ?`)
      .run(count - 2, now(), current.essay_id);
  });
  return true;
}

export function setQuestionExperiences(userId, questionId, experienceIds) {
  const question = db.prepare(`SELECT q.id FROM essay_questions q JOIN essays e ON e.id = q.essay_id WHERE q.id = ? AND e.user_id = ?`).get(questionId, userId);
  if (!question) return null;
  const valid = experienceIds.filter((id) => db.prepare("SELECT 1 FROM experiences WHERE id = ? AND user_id = ?").get(id, userId));
  transaction(() => {
    db.prepare("DELETE FROM question_experiences WHERE question_id = ?").run(questionId);
    const statement = db.prepare("INSERT INTO question_experiences (question_id, experience_id, position) VALUES (?, ?, ?)");
    [...new Set(valid)].forEach((id, position) => statement.run(questionId, id, position));
    db.prepare("UPDATE essay_questions SET needs_regeneration = 1, updated_at = ? WHERE id = ?").run(now(), questionId);
  });
  return mapQuestion(db.prepare("SELECT * FROM essay_questions WHERE id = ?").get(questionId));
}

export function getQuestionContext(userId, questionId) {
  const question = db.prepare(`SELECT q.*, e.company, e.role, e.blind_mode, e.ai_rules, e.reference_text FROM essay_questions q JOIN essays e ON e.id = q.essay_id
    WHERE q.id = ? AND e.user_id = ?`).get(questionId, userId);
  if (!question) return null;
  const contexts = db.prepare(`SELECT x.title, x.evidence, x.star_situation AS situation, x.star_task AS task,
    x.star_action AS action, x.star_result AS result FROM question_experiences qe JOIN experiences x ON x.id = qe.experience_id
    WHERE qe.question_id = ? AND x.user_id = ? ORDER BY qe.position`).all(questionId, userId);
  return { question, contexts };
}

export function saveGeneratedDraft(userId, questionId, text) {
  return updateQuestion(userId, questionId, { draft: text, needsRegeneration: 0 });
}

export function createApplication(userId, payload) {
  const id = randomUUID();
  const stamp = now();
  db.prepare(`INSERT INTO applications (id, user_id, company, role, submitted_at, status, essay_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`).run(id, userId, String(payload.company || "새 지원").trim(), String(payload.role || "직무 미정").trim(), String(payload.submittedAt || ""), String(payload.status || "지원 예정"), stamp);
  return db.prepare("SELECT id, company, role, submitted_at AS submittedAt, status, essay_id AS essayId, updated_at AS updatedAt FROM applications WHERE id = ?").get(id);
}

export function updateApplication(userId, id, patch) {
  const current = db.prepare("SELECT * FROM applications WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;
  db.prepare(`UPDATE applications SET company = ?, role = ?, submitted_at = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?`).run(
    String(patch.company ?? current.company).trim(), String(patch.role ?? current.role).trim(), String(patch.submittedAt ?? current.submitted_at), String(patch.status ?? current.status), now(), id, userId,
  );
  return db.prepare("SELECT id, company, role, submitted_at AS submittedAt, status, essay_id AS essayId, updated_at AS updatedAt FROM applications WHERE id = ?").get(id);
}

export function deleteApplication(userId, id) {
  return db.prepare("DELETE FROM applications WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

db.exec("PRAGMA optimize;");
