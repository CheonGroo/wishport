import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
try {
  loadEnvFile(join(__dirname, ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

export const usesSupabaseDb = Boolean(supabaseUrl && supabaseKey);

export const supabaseAdmin = usesSupabaseDb
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const now = () => new Date().toISOString();
const clean = (value) => String(value ?? "").trim();

function assertSupabase() {
  if (!supabaseAdmin) {
    throw new Error("Supabase DB 환경변수가 설정되지 않았습니다.");
  }
}

async function one(query, label = "데이터") {
  const { data, error } = await query;
  if (error) throw new Error(`${label}을 불러오지 못했습니다: ${error.message}`);
  return data || null;
}

async function many(query, label = "데이터") {
  const { data, error } = await query;
  if (error) throw new Error(`${label}을 불러오지 못했습니다: ${error.message}`);
  return data || [];
}

async function changed(query, label = "데이터") {
  const { error } = await query;
  if (error) throw new Error(`${label}을 저장하지 못했습니다: ${error.message}`);
  return true;
}

const defaultQuestions = [
  ["지원 동기와 입사 후 목표를 작성해 주세요.", "지원동기"],
  ["협업 과정에서 문제를 해결한 경험을 작성해 주세요.", "협업 · 문제해결"],
  ["직무 역량을 키우기 위해 노력한 경험을 작성해 주세요.", "직무역량"],
];

export const interviewCoreClusters = [
  ["self_intro", "자기소개", "Core", "communication"],
  ["motivation", "지원동기", "Core", "motivation"],
  ["job_choice", "직무 선택 이유", "Core", "job_understanding"],
  ["strength", "강점", "Core", "ownership"],
  ["weakness", "약점", "Core", "learning"],
  ["collaboration", "협업", "Behavioral", "collaboration"],
  ["conflict", "갈등", "Behavioral", "conflict_resolution"],
  ["responsibility", "책임감", "Behavioral", "responsibility"],
  ["initiative", "주도성", "Behavioral", "leadership"],
  ["problem_solving", "문제해결", "Behavioral", "problem_solving"],
  ["failure", "실패", "Behavioral", "learning"],
  ["challenge", "도전", "Behavioral", "adaptability"],
  ["adaptability", "변화 대응", "Behavioral", "adaptability"],
  ["feedback", "피드백 수용", "Behavioral", "learning"],
  ["representative_project", "대표 프로젝트", "Experience", "ownership"],
  ["job_competency", "직무 역량", "Job Knowledge", "technical_depth"],
  ["future_goal", "입사 후 목표", "Job Knowledge", "motivation"],
].map(([id, label, group, competency]) => ({ id, label, group, competency }));

const mapProfile = (row) => ({
  name: row.display_name || "",
  role: row.role || "",
  email: row.email || "",
  phone: row.phone || "",
  school: row.school || "",
  major: row.major || "",
  gpa: row.gpa || "",
  location: row.location || "",
  website: row.website || "",
  github: row.github || "",
  educationPeriod: row.education_period || "",
  careerTitle: row.career_title || "",
  careerPeriod: row.career_period || "",
  careerSummary: row.career_summary || "",
  educations: [],
  careers: [],
  photoData: row.photo_data || "",
  updatedAt: row.updated_at,
});

const mapEducation = (row) => ({
  id: row.id,
  school: row.school || "",
  major: row.major || "",
  degree: row.degree || "",
  gpa: row.gpa || "",
  startedAt: row.started_at || "",
  endedAt: row.ended_at || "",
  description: row.description || "",
  position: row.position || 0,
});

const mapCareer = (row) => ({
  id: row.id,
  company: row.company || "",
  role: row.role || "",
  startedAt: row.started_at || "",
  endedAt: row.ended_at || "",
  summary: row.summary || "",
  position: row.position || 0,
});

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
  chips: Array.isArray(row.chips) ? row.chips : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapArchiveItem = (row) => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  detail: row.detail,
  issuer: row.issuer || "",
  grade: row.grade || "",
  acquiredAt: row.acquired_at || "",
  fileName: row.file_name || "",
  fileType: row.file_type || "",
  fileData: row.file_data || "",
  ocrText: row.ocr_text || "",
  tone: row.tone,
  position: row.position,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapQuestion = (row, selectedExperienceIds = []) => ({
  id: row.id,
  position: row.position,
  prompt: row.prompt,
  charLimit: row.char_limit,
  theme: row.theme,
  draft: row.draft,
  feedback: row.feedback,
  annotations: Array.isArray(row.annotations) ? row.annotations : [],
  needsRegeneration: Boolean(row.needs_regeneration),
  updatedAt: row.updated_at,
  selectedExperienceIds,
});

const mapApplication = (row) => ({
  id: row.id,
  company: row.company,
  role: row.role,
  jobTitle: row.job_title || "",
  submittedAt: row.submitted_at,
  status: row.status,
  essayId: row.essay_id,
  interviewSetId: row.interview_set_id || "",
  updatedAt: row.updated_at,
  essayStatus: row.essays?.status,
});

const mapInterviewAsset = (row) => ({
  id: row.id,
  questionClusterId: row.question_cluster_id,
  clusterLabel: row.cluster_label,
  representativeExperienceId: row.representative_experience_id || "",
  coreMessage: row.core_message || "",
  talkingPoints: row.talking_points || {},
  fullAnswer: row.full_answer || "",
  followupQuestions: Array.isArray(row.followup_questions)
    ? row.followup_questions
    : [],
  archiveGrounding: row.archive_grounding || {},
  weakSpots: Array.isArray(row.weak_spots) ? row.weak_spots : [],
  readiness: row.readiness || "missing",
  updatedAt: row.updated_at,
});

// interview_sessions rows double as "Interview Set" records — a named, optionally
// essay/application-linked collection of Q&A questions.
const mapInterviewSession = (row, questions = []) => ({
  id: row.id,
  applicationId: row.application_id || "",
  essayId: row.essay_id || "",
  name: row.name || "",
  company: row.company || "",
  role: row.role || "",
  sourceType: row.source_type || "manual",
  questionCategory: row.question_category || "",
  jdProvided: Boolean(row.jd_provided),
  jdText: row.jd_text || "",
  mode: row.mode,
  difficulty: row.difficulty,
  questionCount: row.question_count,
  followupDepth: row.followup_depth,
  status: row.status,
  readyCount: questions.filter((question) => question.status === "ready").length,
  readiness: questions.length
    ? Math.round(
        (questions.filter((question) => question.status === "ready").length /
          questions.length) *
          100,
      )
    : row.readiness || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  questions: questions.slice().sort((a, b) => a.position - b.position),
});

function questionStatusFromAnswer(answerText = "") {
  const trimmed = clean(answerText);
  if (!trimmed) return "missing";
  return trimmed.length >= 120 ? "ready" : "need_refinement";
}

const mapInterviewQuestion = (row) => ({
  id: row.id,
  sessionId: row.session_id || "",
  applicationId: row.application_id || "",
  questionType: row.question_type,
  competencyId: row.competency_id,
  questionClusterId: row.question_cluster_id,
  sourceType: row.source_type,
  sourceId: row.source_id,
  questionText: row.question_text,
  difficulty: row.difficulty,
  parentQuestionId: row.parent_question_id || "",
  matchedAnswerAssetId: row.matched_answer_asset_id || "",
  answerText: row.answer_text || "",
  followupText: row.followup_text || "",
  position: row.position ?? 0,
  status: questionStatusFromAnswer(row.answer_text),
  feedback: row.feedback || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapInterviewWeakSpot = (row) => ({
  id: row.id,
  applicationId: row.application_id || "",
  sourceType: row.source_type,
  sourceId: row.source_id,
  description: row.description,
  severity: row.severity,
  resolvedAt: row.resolved_at || "",
  archiveUpdateNeeded: Boolean(row.archive_update_needed),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function mapEssay(row, questions = []) {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status,
    currentStep: row.current_step,
    maxStep: row.max_step,
    activeQuestion: row.active_question,
    sources: {
      jobPost: {
        url: row.job_post_url || row.source_url || "",
        file: row.job_post_file || "",
      },
      jobDescription: {
        url: row.jd_url || "",
        file: row.jd_file || row.source_file || "",
      },
    },
    rules: {
      blindMode: Boolean(row.blind_mode),
      aiInstructions: row.ai_rules || "",
    },
    reference: {
      file: row.reference_file || "",
      text: row.reference_text || "",
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questions,
  };
}

export async function ensureUserData(user) {
  assertSupabase();
  const stamp = now();
  const payload = {
    id: user.id,
    email: user.email || "",
    display_name: user.name || user.email || "",
    avatar_url: user.picture || "",
    updated_at: stamp,
  };
  await changed(
    supabaseAdmin
      .from("user_profiles")
      .upsert(payload, { onConflict: "id", ignoreDuplicates: false }),
    "사용자 프로필",
  );
}

export async function getEssay(userId, essayId) {
  assertSupabase();
  const essay = await one(
    supabaseAdmin
      .from("essays")
      .select("*")
      .eq("id", essayId)
      .eq("user_id", userId)
      .maybeSingle(),
    "자기소개서",
  );
  if (!essay) return null;
  const questions = await many(
    supabaseAdmin
      .from("essay_questions")
      .select("*")
      .eq("essay_id", essay.id)
      .order("position", { ascending: true }),
    "문항",
  );
  const links = questions.length
    ? await many(
        supabaseAdmin
          .from("question_experiences")
          .select("question_id, experience_id, position")
          .in("question_id", questions.map((question) => question.id))
          .order("position", { ascending: true }),
        "문항 경험 연결",
      )
    : [];
  const linkMap = new Map();
  for (const link of links) {
    const current = linkMap.get(link.question_id) || [];
    current.push(link.experience_id);
    linkMap.set(link.question_id, current);
  }
  return mapEssay(
    essay,
    questions.map((question) =>
      mapQuestion(question, linkMap.get(question.id) || []),
    ),
  );
}

export async function getBootstrap(user) {
  await ensureUserData(user);
  const userId = user.id;
  const profileRow = await one(
    supabaseAdmin.from("user_profiles").select("*").eq("id", userId).single(),
    "프로필",
  );
  const educations = (
    await many(
      supabaseAdmin
        .from("education_entries")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true }),
      "학력",
    )
  ).map(mapEducation);
  const careers = (
    await many(
      supabaseAdmin
        .from("career_entries")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true }),
      "경력",
    )
  ).map(mapCareer);
  const experiences = (
    await many(
      supabaseAdmin
        .from("experiences")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      "경험",
    )
  ).map(mapExperience);
  const archiveItems = (
    await many(
      supabaseAdmin
        .from("archive_items")
        .select("*")
        .eq("user_id", userId)
        .order("kind", { ascending: true })
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      "아카이브 항목",
    )
  ).map(mapArchiveItem);
  const essayRows = await many(
    supabaseAdmin
      .from("essays")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    "자기소개서",
  );
  const essays = await Promise.all(
    essayRows.map((row) => getEssay(userId, row.id)),
  );
  const applications = (
    await many(
      supabaseAdmin
        .from("applications")
        .select("*, essays(status)")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      "지원 현황",
    )
  ).map(mapApplication);
  const interview = await getInterviewBootstrap(userId);
  return {
    profile: { ...mapProfile(profileRow), educations, careers },
    experiences,
    archiveItems,
    essays,
    applications,
    interview,
  };
}

async function replaceEducationEntries(userId, entries = []) {
  await changed(
    supabaseAdmin.from("education_entries").delete().eq("user_id", userId),
    "학력",
  );
  const rows = entries
    .filter((item) => clean(item.school || item.major || item.degree))
    .map((item, position) => ({
      user_id: userId,
      school: clean(item.school),
      major: clean(item.major),
      degree: clean(item.degree),
      gpa: clean(item.gpa),
      started_at: clean(item.startedAt),
      ended_at: clean(item.endedAt),
      description: clean(item.description),
      position,
      updated_at: now(),
    }));
  if (rows.length) {
    await changed(supabaseAdmin.from("education_entries").insert(rows), "학력");
  }
}

async function replaceCareerEntries(userId, entries = []) {
  await changed(
    supabaseAdmin.from("career_entries").delete().eq("user_id", userId),
    "경력",
  );
  const rows = entries
    .filter((item) => clean(item.company || item.role || item.summary))
    .map((item, position) => ({
      user_id: userId,
      company: clean(item.company),
      role: clean(item.role),
      started_at: clean(item.startedAt),
      ended_at: clean(item.endedAt),
      summary: clean(item.summary),
      position,
      updated_at: now(),
    }));
  if (rows.length) {
    await changed(supabaseAdmin.from("career_entries").insert(rows), "경력");
  }
}

export async function updateProfile(userId, patch) {
  const current = await one(
    supabaseAdmin.from("user_profiles").select("*").eq("id", userId).single(),
    "프로필",
  );
  const stamp = now();
  const payload = {
    display_name: clean(patch.name ?? current.display_name),
    role: clean(patch.role ?? current.role),
    email: clean(patch.email ?? current.email),
    phone: clean(patch.phone ?? current.phone),
    school: clean(patch.school ?? current.school),
    major: clean(patch.major ?? current.major),
    gpa: clean(patch.gpa ?? current.gpa),
    location: clean(patch.location ?? current.location),
    website: clean(patch.website ?? current.website),
    github: clean(patch.github ?? current.github),
    education_period: clean(patch.educationPeriod ?? current.education_period),
    career_title: clean(patch.careerTitle ?? current.career_title),
    career_period: clean(patch.careerPeriod ?? current.career_period),
    career_summary: clean(patch.careerSummary ?? current.career_summary),
    photo_data: String(patch.photoData ?? current.photo_data),
    updated_at: stamp,
  };
  await changed(
    supabaseAdmin.from("user_profiles").update(payload).eq("id", userId),
    "프로필",
  );
  if (Array.isArray(patch.educations)) {
    await replaceEducationEntries(userId, patch.educations);
  }
  if (Array.isArray(patch.careers)) {
    await replaceCareerEntries(userId, patch.careers);
  }
  return (await getBootstrap({ id: userId })).profile;
}

export async function createExperience(userId, payload) {
  const stamp = now();
  const star = payload.star || {};
  const row = await one(
    supabaseAdmin
      .from("experiences")
      .insert({
        user_id: userId,
        title: clean(payload.title) || "새 경험",
        meta: clean(payload.meta),
        summary: clean(payload.summary),
        evidence: clean(payload.evidence),
        star_situation: clean(star.situation),
        star_task: clean(star.task),
        star_action: clean(star.action),
        star_result: clean(star.result),
        chips: Array.isArray(payload.chips) ? payload.chips : [],
        created_at: stamp,
        updated_at: stamp,
      })
      .select()
      .single(),
    "경험",
  );
  return mapExperience(row);
}

export async function updateExperience(userId, id, patch) {
  const current = await one(
    supabaseAdmin
      .from("experiences")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    "경험",
  );
  if (!current) return null;
  const star = patch.star || {};
  const row = await one(
    supabaseAdmin
      .from("experiences")
      .update({
        title: clean(patch.title ?? current.title),
        meta: clean(patch.meta ?? current.meta),
        summary: clean(patch.summary ?? current.summary),
        evidence: clean(patch.evidence ?? current.evidence),
        star_situation: clean(star.situation ?? current.star_situation),
        star_task: clean(star.task ?? current.star_task),
        star_action: clean(star.action ?? current.star_action),
        star_result: clean(star.result ?? current.star_result),
        chips: Array.isArray(patch.chips) ? patch.chips : current.chips,
        updated_at: now(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single(),
    "경험",
  );
  return mapExperience(row);
}

export async function deleteExperience(userId, id) {
  await changed(
    supabaseAdmin.from("experiences").delete().eq("id", id).eq("user_id", userId),
    "경험",
  );
  return true;
}

export async function createArchiveItem(userId, payload) {
  const kind = payload.kind === "asset" ? "asset" : "achievement";
  const maxRow = await one(
    supabaseAdmin
      .from("archive_items")
      .select("position")
      .eq("user_id", userId)
      .eq("kind", kind)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "아카이브 순서",
  );
  const stamp = now();
  const row = await one(
    supabaseAdmin
      .from("archive_items")
      .insert({
        user_id: userId,
        kind,
        title: clean(payload.title) || "새 항목",
        detail: clean(payload.detail),
        issuer: clean(payload.issuer),
        grade: clean(payload.grade),
        acquired_at: clean(payload.acquiredAt),
        file_name: clean(payload.fileName),
        file_type: clean(payload.fileType),
        file_data: String(payload.fileData || ""),
        ocr_text: String(payload.ocrText || ""),
        tone: String(payload.tone || (kind === "asset" ? "lilac" : "mint")),
        position: Number(maxRow?.position ?? -1) + 1,
        created_at: stamp,
        updated_at: stamp,
      })
      .select()
      .single(),
    "아카이브 항목",
  );
  return mapArchiveItem(row);
}

export async function updateArchiveItem(userId, id, patch) {
  const current = await one(
    supabaseAdmin
      .from("archive_items")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    "아카이브 항목",
  );
  if (!current) return null;
  const row = await one(
    supabaseAdmin
      .from("archive_items")
      .update({
        title: clean(patch.title ?? current.title),
        detail: clean(patch.detail ?? current.detail),
        issuer: clean(patch.issuer ?? current.issuer),
        grade: clean(patch.grade ?? current.grade),
        acquired_at: clean(patch.acquiredAt ?? current.acquired_at),
        file_name: clean(patch.fileName ?? current.file_name),
        file_type: clean(patch.fileType ?? current.file_type),
        file_data: String(patch.fileData ?? current.file_data),
        ocr_text: String(patch.ocrText ?? current.ocr_text),
        tone: String(patch.tone ?? current.tone),
        updated_at: now(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single(),
    "아카이브 항목",
  );
  return mapArchiveItem(row);
}

export async function deleteArchiveItem(userId, id) {
  await changed(
    supabaseAdmin
      .from("archive_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId),
    "아카이브 항목",
  );
  return true;
}

export async function createEssay(userId, payload = {}) {
  const stamp = now();
  const essay = await one(
    supabaseAdmin
      .from("essays")
      .insert({
        user_id: userId,
        company: clean(payload.company) || "새 지원",
        role: clean(payload.role) || "직무 미정",
        created_at: stamp,
        updated_at: stamp,
      })
      .select()
      .single(),
    "자기소개서",
  );
  await changed(
    supabaseAdmin.from("essay_questions").insert(
      defaultQuestions.map(([prompt, theme], position) => ({
        essay_id: essay.id,
        position,
        prompt,
        char_limit: 600,
        theme,
        updated_at: stamp,
      })),
    ),
    "문항",
  );
  await changed(
    supabaseAdmin.from("applications").insert({
      user_id: userId,
      company: essay.company,
      role: essay.role,
      status: "지원 예정",
      essay_id: essay.id,
      updated_at: stamp,
    }),
    "지원 현황",
  );
  return getEssay(userId, essay.id);
}

export async function updateEssay(userId, id, patch) {
  const current = await one(
    supabaseAdmin
      .from("essays")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    "자기소개서",
  );
  if (!current) return null;
  const questionRows = await many(
    supabaseAdmin
      .from("essay_questions")
      .select("id")
      .eq("essay_id", id),
    "문항 수",
  );
  const questionCount = questionRows.length;
  const currentStep = Math.max(
    0,
    Math.min(2, Number(patch.currentStep ?? current.current_step)),
  );
  const maxStep = Math.max(
    current.max_step,
    Math.max(0, Math.min(3, Number(patch.maxStep ?? current.max_step))),
  );
  const activeQuestion = Math.max(
    0,
    Math.min(
      Math.max(0, questionCount - 1),
      Number(patch.activeQuestion ?? current.active_question),
    ),
  );
  const sources = patch.sources || {};
  const rules = patch.rules || {};
  const reference = patch.reference || {};
  const stamp = now();
  await changed(
    supabaseAdmin
      .from("essays")
      .update({
        company: clean(patch.company ?? current.company),
        role: clean(patch.role ?? current.role),
        status: String(patch.status ?? current.status),
        current_step: currentStep,
        max_step: maxStep,
        active_question: activeQuestion,
        source_url: String(sources.jobPost?.url ?? current.source_url),
        source_text: String(current.source_text),
        source_file: String(sources.jobDescription?.file ?? current.source_file),
        job_post_url: String(sources.jobPost?.url ?? current.job_post_url),
        job_post_file: String(sources.jobPost?.file ?? current.job_post_file),
        jd_url: String(sources.jobDescription?.url ?? current.jd_url),
        jd_file: String(sources.jobDescription?.file ?? current.jd_file),
        blind_mode: Boolean(rules.blindMode ?? current.blind_mode),
        ai_rules: String(rules.aiInstructions ?? current.ai_rules),
        reference_file: String(reference.file ?? current.reference_file),
        reference_text: String(reference.text ?? current.reference_text),
        updated_at: stamp,
      })
      .eq("id", id)
      .eq("user_id", userId),
    "자기소개서",
  );
  if (patch.company !== undefined || patch.role !== undefined || patch.status === "완료") {
    const applicationPatch = { updated_at: stamp };
    if (patch.company !== undefined) applicationPatch.company = clean(patch.company);
    if (patch.role !== undefined) applicationPatch.role = clean(patch.role);
    await changed(
      supabaseAdmin
        .from("applications")
        .update(applicationPatch)
        .eq("essay_id", id)
        .eq("user_id", userId),
      "지원 현황",
    );
  }
  return getEssay(userId, id);
}

export async function deleteEssay(userId, id) {
  await changed(
    supabaseAdmin
      .from("applications")
      .update({ essay_id: null, updated_at: now() })
      .eq("essay_id", id)
      .eq("user_id", userId),
    "지원 현황",
  );
  await changed(
    supabaseAdmin.from("essays").delete().eq("id", id).eq("user_id", userId),
    "자기소개서",
  );
  return true;
}

export async function updateQuestion(userId, questionId, patch) {
  const current = await one(
    supabaseAdmin
      .from("essay_questions")
      .select("*, essays!inner(user_id)")
      .eq("id", questionId)
      .eq("essays.user_id", userId)
      .maybeSingle(),
    "문항",
  );
  if (!current) return null;
  const promptChanged =
    patch.prompt !== undefined && String(patch.prompt) !== current.prompt;
  const limit = Math.max(
    100,
    Math.min(5000, Number(patch.charLimit ?? current.char_limit) || 600),
  );
  const row = await one(
    supabaseAdmin
      .from("essay_questions")
      .update({
        prompt: String(patch.prompt ?? current.prompt),
        char_limit: limit,
        theme: String(patch.theme ?? current.theme),
        draft: String(patch.draft ?? current.draft),
        feedback: String(patch.feedback ?? current.feedback),
        annotations: Array.isArray(patch.annotations)
          ? patch.annotations
          : current.annotations || [],
        needs_regeneration: Boolean(
          patch.needsRegeneration ??
            (promptChanged ? true : current.needs_regeneration),
        ),
        updated_at: now(),
      })
      .eq("id", questionId)
      .select()
      .single(),
    "문항",
  );
  return mapQuestion(row, await selectedExperienceIds(questionId));
}

export async function createQuestion(userId, essayId, payload = {}) {
  const essay = await one(
    supabaseAdmin
      .from("essays")
      .select("id")
      .eq("id", essayId)
      .eq("user_id", userId)
      .maybeSingle(),
    "자기소개서",
  );
  if (!essay) return null;
  const questions = await many(
    supabaseAdmin.from("essay_questions").select("id").eq("essay_id", essayId),
    "문항",
  );
  if (questions.length >= 8)
    throw new Error("자기소개서 문항은 최대 8개까지 추가할 수 있습니다.");
  const stamp = now();
  const row = await one(
    supabaseAdmin
      .from("essay_questions")
      .insert({
        essay_id: essayId,
        position: questions.length,
        prompt: clean(payload.prompt) || "새 자기소개서 문항",
        char_limit: Math.max(100, Math.min(5000, Number(payload.charLimit) || 600)),
        theme: clean(payload.theme) || "직접 입력",
        updated_at: stamp,
      })
      .select()
      .single(),
    "문항",
  );
  await changed(
    supabaseAdmin.from("essays").update({ updated_at: stamp }).eq("id", essayId),
    "자기소개서",
  );
  return mapQuestion(row);
}

export async function deleteQuestion(userId, questionId) {
  const current = await one(
    supabaseAdmin
      .from("essay_questions")
      .select("id, essay_id, position, essays!inner(user_id)")
      .eq("id", questionId)
      .eq("essays.user_id", userId)
      .maybeSingle(),
    "문항",
  );
  if (!current) return false;
  const questions = await many(
    supabaseAdmin
      .from("essay_questions")
      .select("id")
      .eq("essay_id", current.essay_id),
    "문항",
  );
  if (questions.length <= 1)
    throw new Error("자기소개서에는 문항이 하나 이상 필요합니다.");
  await changed(
    supabaseAdmin.from("essay_questions").delete().eq("id", questionId),
    "문항",
  );
  const following = await many(
    supabaseAdmin
      .from("essay_questions")
      .select("id, position")
      .eq("essay_id", current.essay_id)
      .gt("position", current.position),
    "문항",
  );
  await Promise.all(
    following.map((question) =>
      changed(
        supabaseAdmin
          .from("essay_questions")
          .update({ position: question.position - 1 })
          .eq("id", question.id),
        "문항 순서",
      ),
    ),
  );
  await changed(
    supabaseAdmin
      .from("essays")
      .update({ active_question: Math.max(0, questions.length - 2), updated_at: now() })
      .eq("id", current.essay_id),
    "자기소개서",
  );
  return true;
}

async function selectedExperienceIds(questionId) {
  return (
    await many(
      supabaseAdmin
        .from("question_experiences")
        .select("experience_id")
        .eq("question_id", questionId)
        .order("position", { ascending: true }),
      "문항 경험 연결",
    )
  ).map((row) => row.experience_id);
}

export async function setQuestionExperiences(userId, questionId, experienceIds) {
  const question = await one(
    supabaseAdmin
      .from("essay_questions")
      .select("id, essays!inner(user_id)")
      .eq("id", questionId)
      .eq("essays.user_id", userId)
      .maybeSingle(),
    "문항",
  );
  if (!question) return null;
  const uniqueIds = [...new Set(experienceIds)];
  const valid = uniqueIds.length
    ? await many(
        supabaseAdmin
          .from("experiences")
          .select("id")
          .eq("user_id", userId)
          .in("id", uniqueIds),
        "경험",
      )
    : [];
  await changed(
    supabaseAdmin.from("question_experiences").delete().eq("question_id", questionId),
    "문항 경험 연결",
  );
  if (valid.length) {
    await changed(
      supabaseAdmin.from("question_experiences").insert(
        valid.map((item, position) => ({
          question_id: questionId,
          experience_id: item.id,
          position,
        })),
      ),
      "문항 경험 연결",
    );
  }
  await changed(
    supabaseAdmin
      .from("essay_questions")
      .update({ needs_regeneration: true, updated_at: now() })
      .eq("id", questionId),
    "문항",
  );
  const row = await one(
    supabaseAdmin.from("essay_questions").select("*").eq("id", questionId).single(),
    "문항",
  );
  return mapQuestion(row, await selectedExperienceIds(questionId));
}

export async function getQuestionContext(userId, questionId) {
  const question = await one(
    supabaseAdmin
      .from("essay_questions")
      .select("*, essays!inner(company, role, blind_mode, ai_rules, reference_text, user_id)")
      .eq("id", questionId)
      .eq("essays.user_id", userId)
      .maybeSingle(),
    "문항",
  );
  if (!question) return null;
  const links = await many(
    supabaseAdmin
      .from("question_experiences")
      .select("position, experiences!inner(title, evidence, star_situation, star_task, star_action, star_result, user_id)")
      .eq("question_id", questionId)
      .eq("experiences.user_id", userId)
      .order("position", { ascending: true }),
    "문항 경험 연결",
  );
  return {
    question: {
      ...question,
      company: question.essays.company,
      role: question.essays.role,
      blind_mode: question.essays.blind_mode,
      ai_rules: question.essays.ai_rules,
      reference_text: question.essays.reference_text,
    },
    contexts: links.map((link) => ({
      title: link.experiences.title,
      evidence: link.experiences.evidence,
      situation: link.experiences.star_situation,
      task: link.experiences.star_task,
      action: link.experiences.star_action,
      result: link.experiences.star_result,
    })),
  };
}

export async function saveGeneratedDraft(userId, questionId, text) {
  return updateQuestion(userId, questionId, {
    draft: text,
    needsRegeneration: false,
  });
}

export async function createApplication(userId, payload) {
  const stamp = now();
  let company = clean(payload.company);
  let role = clean(payload.role);
  const essayId = clean(payload.essayId);
  if (essayId && (!company || !role)) {
    const essay = await one(
      supabaseAdmin
        .from("essays")
        .select("company, role")
        .eq("id", essayId)
        .eq("user_id", userId)
        .maybeSingle(),
      "자기소개서",
    );
    company = company || essay?.company || "";
    role = role || essay?.role || "";
  }
  const row = await one(
    supabaseAdmin
      .from("applications")
      .insert({
        user_id: userId,
        company: company || "새 지원",
        role: role || "직무 미정",
        job_title: clean(payload.jobTitle),
        submitted_at: String(payload.submittedAt || ""),
        status: String(payload.status || "지원 예정"),
        essay_id: essayId || null,
        updated_at: stamp,
      })
      .select()
      .single(),
    "지원 현황",
  );
  return mapApplication(row);
}

export async function updateApplication(userId, id, patch) {
  const current = await one(
    supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    "지원 현황",
  );
  if (!current) return null;
  const row = await one(
    supabaseAdmin
      .from("applications")
      .update({
        company: clean(patch.company ?? current.company),
        role: clean(patch.role ?? current.role),
        job_title: clean(patch.jobTitle ?? current.job_title),
        submitted_at: String(patch.submittedAt ?? current.submitted_at),
        status: String(patch.status ?? current.status),
        essay_id: clean(patch.essayId ?? current.essay_id) || null,
        interview_set_id: clean(patch.interviewSetId ?? current.interview_set_id) || null,
        updated_at: now(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single(),
    "지원 현황",
  );
  return mapApplication(row);
}

export async function deleteApplication(userId, id) {
  await changed(
    supabaseAdmin
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId),
    "지원 현황",
  );
  return true;
}

export async function getInterviewBootstrap(userId) {
  const assetRows = await many(
    supabaseAdmin
      .from("interview_answer_assets")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    "면접 답변 아카이브",
  );
  const questionRows = await many(
    supabaseAdmin
      .from("interview_questions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80),
    "면접 질문",
  );
  const sessionRows = await many(
    supabaseAdmin
      .from("interview_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(40),
    "Interview Set",
  );
  const weakRows = await many(
    supabaseAdmin
      .from("interview_weak_spots")
      .select("*")
      .eq("user_id", userId)
      .is("resolved_at", null)
      .order("updated_at", { ascending: false })
      .limit(40),
    "면접 Weak Spot",
  );
  const questions = questionRows.map(mapInterviewQuestion);
  return {
    clusters: interviewCoreClusters,
    answerAssets: assetRows.map(mapInterviewAsset),
    sets: sessionRows.map((session) =>
      mapInterviewSession(
        session,
        questions.filter((question) => question.sessionId === session.id),
      ),
    ),
    questions,
    weakSpots: weakRows.map(mapInterviewWeakSpot),
  };
}

function answerStatusFromAsset(asset) {
  const hasCore = Boolean(clean(asset.coreMessage));
  const hasFull = Boolean(clean(asset.fullAnswer));
  const points = asset.talkingPoints || {};
  const pointCount = Object.values(points).filter((value) => clean(value)).length;
  if (hasCore && hasFull && pointCount >= 3) return "ready";
  if (hasCore || hasFull || pointCount > 0) return "need_refinement";
  return "missing";
}

export async function upsertInterviewAnswerAsset(userId, payload = {}) {
  const cluster =
    interviewCoreClusters.find((item) => item.id === payload.questionClusterId) ||
    interviewCoreClusters[0];
  const row = await one(
    supabaseAdmin
      .from("interview_answer_assets")
      .upsert(
        {
          user_id: userId,
          question_cluster_id: clean(payload.questionClusterId) || cluster.id,
          cluster_label: clean(payload.clusterLabel) || cluster.label,
          representative_experience_id:
            clean(payload.representativeExperienceId) || null,
          core_message: clean(payload.coreMessage),
          talking_points: payload.talkingPoints || {},
          full_answer: clean(payload.fullAnswer),
          followup_questions: Array.isArray(payload.followupQuestions)
            ? payload.followupQuestions
            : [],
          archive_grounding: payload.archiveGrounding || {},
          weak_spots: Array.isArray(payload.weakSpots) ? payload.weakSpots : [],
          readiness: answerStatusFromAsset(payload),
          updated_at: now(),
        },
        { onConflict: "user_id,question_cluster_id", ignoreDuplicates: false },
      )
      .select()
      .single(),
    "면접 답변",
  );
  return mapInterviewAsset(row);
}

export async function updateInterviewAnswerAsset(userId, id, patch = {}) {
  const current = await one(
    supabaseAdmin
      .from("interview_answer_assets")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    "면접 답변",
  );
  if (!current) return null;
  const next = {
    questionClusterId: patch.questionClusterId ?? current.question_cluster_id,
    clusterLabel: patch.clusterLabel ?? current.cluster_label,
    representativeExperienceId:
      patch.representativeExperienceId ?? current.representative_experience_id,
    coreMessage: patch.coreMessage ?? current.core_message,
    talkingPoints: patch.talkingPoints ?? current.talking_points,
    fullAnswer: patch.fullAnswer ?? current.full_answer,
    followupQuestions: patch.followupQuestions ?? current.followup_questions,
    archiveGrounding: patch.archiveGrounding ?? current.archive_grounding,
    weakSpots: patch.weakSpots ?? current.weak_spots,
  };
  const row = await one(
    supabaseAdmin
      .from("interview_answer_assets")
      .update({
        representative_experience_id: clean(next.representativeExperienceId) || null,
        core_message: clean(next.coreMessage),
        talking_points: next.talkingPoints || {},
        full_answer: clean(next.fullAnswer),
        followup_questions: Array.isArray(next.followupQuestions)
          ? next.followupQuestions
          : [],
        archive_grounding: next.archiveGrounding || {},
        weak_spots: Array.isArray(next.weakSpots) ? next.weakSpots : [],
        readiness: answerStatusFromAsset(next),
        updated_at: now(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single(),
    "면접 답변",
  );
  return mapInterviewAsset(row);
}

// Creates an Interview Set (an interview_sessions row + its interview_questions).
// Two creation paths, both supported here:
//   A. Essay-based  — payload.essayId (and/or applicationId) is set; questions are
//      generated from the essay + JD + Archive experiences.
//   B. Standalone    — no essay/application; user supplies name/company/role/
//      questionCategory/jdText directly, questions are generated from experiences
//      plus the supplied company/role context (or fall back to generic prompts).
export async function createInterviewSet(userId, payload = {}) {
  const applicationId = clean(payload.applicationId);
  const application = applicationId
    ? await one(
        supabaseAdmin
          .from("applications")
          .select("*")
          .eq("id", applicationId)
          .eq("user_id", userId)
          .maybeSingle(),
        "지원 공고",
      )
    : null;
  let essayId = clean(payload.essayId);
  let essayRow = null;
  if (!essayId && application?.essay_id) essayId = application.essay_id;
  if (essayId) {
    essayRow = await one(
      supabaseAdmin
        .from("essays")
        .select("id, company, role")
        .eq("id", essayId)
        .eq("user_id", userId)
        .maybeSingle(),
      "자기소개서",
    );
    if (!essayRow) essayId = "";
  }
  const sourceType = essayId ? "essay" : "manual";
  const company = clean(payload.company) || application?.company || essayRow?.company || "";
  const role = clean(payload.role) || application?.role || essayRow?.role || "";
  const name =
    clean(payload.name) ||
    (company ? `${company}${role ? " · " + role : ""} Interview Set` : "새 Interview Set");
  const assets = (
    await many(
      supabaseAdmin
        .from("interview_answer_assets")
        .select("*")
        .eq("user_id", userId),
      "면접 답변",
    )
  ).map(mapInterviewAsset);
  const pseudoApplication = application || (company || role ? { id: "", company, role } : null);
  const rows = buildInterviewQuestions({
    application: pseudoApplication,
    essay: payload.essay,
    experiences: Array.isArray(payload.experiences) ? payload.experiences : [],
    assets,
    requested: Array.isArray(payload.questions) ? payload.questions : [],
  });
  const stamp = now();
  const session = await one(
    supabaseAdmin
      .from("interview_sessions")
      .insert({
        user_id: userId,
        application_id: application?.id || null,
        essay_id: essayId || null,
        name,
        company,
        role,
        source_type: sourceType,
        question_category: clean(payload.questionCategory),
        jd_provided: Boolean(payload.jdProvided),
        jd_text: clean(payload.jdText),
        mode: sourceType === "essay" ? "essay_based" : "manual",
        difficulty: "standard",
        question_count: rows.length,
        followup_depth: 2,
        status: "in_progress",
        readiness: 0,
        created_at: stamp,
        updated_at: stamp,
      })
      .select()
      .single(),
    "Interview Set",
  );
  const insertedQuestions = rows.length
    ? await many(
        supabaseAdmin
          .from("interview_questions")
          .insert(
            rows.map((row, index) => ({
              user_id: userId,
              session_id: session.id,
              application_id: application?.id || null,
              question_type: row.questionType,
              competency_id: row.competencyId,
              question_cluster_id: row.questionClusterId,
              source_type: row.sourceType,
              source_id: row.sourceId,
              question_text: row.questionText,
              difficulty: row.difficulty,
              status: "missing",
              answer_text: "",
              followup_text: "",
              position: index,
              feedback: row.feedback || {},
              created_at: stamp,
              updated_at: stamp,
            })),
          )
          .select(),
        "면접 질문",
      )
    : [];
  return mapInterviewSession(session, insertedQuestions.map(mapInterviewQuestion));
}

export async function updateInterviewQuestionAnswer(userId, id, patch = {}) {
  const current = await one(
    supabaseAdmin
      .from("interview_questions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    "면접 질문",
  );
  if (!current) return null;
  const row = await one(
    supabaseAdmin
      .from("interview_questions")
      .update({
        answer_text: clean(patch.answerText ?? current.answer_text),
        followup_text: clean(patch.followupText ?? current.followup_text),
        updated_at: now(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single(),
    "면접 질문",
  );
  return mapInterviewQuestion(row);
}

// A standalone question the user writes themselves (not generated for any
// Interview Set) — filed straight into Cabinet under its cluster/category.
export async function createCustomQuestion(userId, payload = {}) {
  const cluster =
    interviewCoreClusters.find((item) => item.id === payload.questionClusterId) ||
    interviewCoreClusters[0];
  const stamp = now();
  const row = await one(
    supabaseAdmin
      .from("interview_questions")
      .insert({
        user_id: userId,
        session_id: null,
        application_id: null,
        question_type: "CUSTOM",
        competency_id: cluster.competency || "",
        question_cluster_id: cluster.id,
        source_type: "CUSTOM",
        source_id: "",
        question_text: clean(payload.questionText) || cluster.label,
        difficulty: "standard",
        status: "missing",
        answer_text: clean(payload.answerText),
        followup_text: clean(payload.followupText),
        feedback: {},
        created_at: stamp,
        updated_at: stamp,
      })
      .select()
      .single(),
    "면접 질문",
  );
  return mapInterviewQuestion(row);
}

// Deletes one question — a standalone Cabinet question or a single question
// out of an Interview Set (the Set itself, and its other questions, stay put).
export async function deleteInterviewQuestion(userId, id) {
  await changed(
    supabaseAdmin
      .from("interview_questions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId),
    "면접 질문",
  );
  return true;
}

// Persists a new question order within one Interview Set (drag/reorder in the UI).
export async function reorderInterviewSetQuestions(userId, setId, questionIds = []) {
  const rows = await many(
    supabaseAdmin
      .from("interview_questions")
      .select("id")
      .eq("session_id", setId)
      .eq("user_id", userId),
    "면접 질문",
  );
  const validIds = new Set(rows.map((row) => row.id));
  const ordered = questionIds.filter((id) => validIds.has(id));
  await Promise.all(
    ordered.map((id, index) =>
      changed(
        supabaseAdmin
          .from("interview_questions")
          .update({ position: index, updated_at: now() })
          .eq("id", id)
          .eq("user_id", userId),
        "면접 질문",
      ),
    ),
  );
  return true;
}

export async function deleteInterviewSet(userId, id) {
  await changed(
    supabaseAdmin
      .from("interview_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId),
    "Interview Set",
  );
  return true;
}

function buildInterviewQuestions({ application, experiences, assets, requested }) {
  if (requested.length) {
    return requested.map((question, index) =>
      normalizeInterviewQuestion(question, assets, application, index),
    );
  }
  const fallbackExperiences = experiences.slice(0, 4);
  const base = [
    {
      questionType: "COMMON",
      competencyId: "communication",
      questionClusterId: "self_intro",
      sourceType: "COMMON",
      questionText: "본인을 1분 안에 소개해주세요.",
    },
    {
      questionType: "COMMON",
      competencyId: "motivation",
      questionClusterId: "motivation",
      sourceType: application ? "JOB" : "COMMON",
      sourceId: application?.id || "",
      questionText: application
        ? `${application.company} ${application.role}에 지원한 이유를 설명해주세요.`
        : "지원동기와 직무 선택 이유를 설명해주세요.",
    },
    ...fallbackExperiences.flatMap((experience) => [
      {
        questionType: "ARCHIVE",
        competencyId: "problem_solving",
        questionClusterId: "problem_solving",
        sourceType: "ARCHIVE",
        sourceId: experience.id,
        questionText: `${experience.title}에서 가장 어려웠던 문제와 해결 과정을 설명해주세요.`,
        feedback: {
          missing: experience.star?.result
            ? "배운 점과 이후 개선 방향을 보완하면 답변 완성도가 올라갑니다."
            : "결과와 배운 점이 부족합니다. Archive 보완이 필요합니다.",
        },
      },
      {
        questionType: "CHALLENGE",
        competencyId: "ownership",
        questionClusterId: "responsibility",
        sourceType: "ARCHIVE",
        sourceId: experience.id,
        questionText: `${experience.title}의 결과가 본인의 기여라고 볼 수 있는 근거는 무엇인가요?`,
        feedback: {
          missing: "본인의 역할 범위와 판단 기준을 더 구체화해야 합니다.",
        },
      },
    ]),
    {
      questionType: "TECHNICAL",
      competencyId: "technical_depth",
      questionClusterId: "job_competency",
      sourceType: "JOB",
      sourceId: application?.id || "",
      questionText: `${application?.role || "지원 직무"}에서 가장 중요하다고 생각하는 기술/역량을 본인 경험과 연결해 설명해주세요.`,
    },
  ].slice(0, 12);
  return base.map((question, index) =>
    normalizeInterviewQuestion(question, assets, application, index),
  );
}

function normalizeInterviewQuestion(question, assets, application, index = 0) {
  const clusterId =
    clean(question.questionClusterId || question.question_cluster_id) ||
    interviewCoreClusters[index % interviewCoreClusters.length].id;
  const cluster = interviewCoreClusters.find((item) => item.id === clusterId);
  const asset = assets.find((item) => item.questionClusterId === clusterId);
  return {
    questionType: clean(question.questionType || question.question_type) || "COMMON",
    competencyId:
      clean(question.competencyId || question.competency_id) ||
      cluster?.competency ||
      "communication",
    questionClusterId: clusterId,
    sourceType: clean(question.sourceType || question.source_type) || "COMMON",
    sourceId: clean(question.sourceId || question.source_id || application?.id),
    questionText: clean(question.questionText || question.question_text) || cluster?.label || "면접 질문",
    difficulty: clean(question.difficulty) || "standard",
    matchedAnswerAssetId: asset?.id || "",
    status: asset?.readiness === "ready" ? "ready" : asset ? "need_refinement" : "missing",
    feedback: question.feedback || {
      completeness: asset?.readiness === "ready" ? 86 : asset ? 58 : 18,
      grounding: asset?.representativeExperienceId ? 80 : 30,
      specificity: asset?.fullAnswer ? 78 : 35,
      followupNeeded: asset?.readiness !== "ready",
    },
  };
}

export async function createInterviewWeakSpotArchiveItem(userId, id) {
  const weak = await one(
    supabaseAdmin
      .from("interview_weak_spots")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    "면접 Weak Spot",
  );
  if (!weak) return null;
  const item = await createArchiveItem(userId, {
    kind: "achievement",
    title: "면접 보완 소재",
    detail: weak.description,
    tone: "lemon",
  });
  await changed(
    supabaseAdmin
      .from("interview_weak_spots")
      .update({ resolved_at: now(), updated_at: now() })
      .eq("id", id)
      .eq("user_id", userId),
    "면접 Weak Spot",
  );
  return item;
}
