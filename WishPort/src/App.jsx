import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  DoorOpen,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleUserRound,
  Cloud,
  Download,
  FilePenLine,
  FileText,
  Globe2,
  GraduationCap,
  GripVertical,
  Highlighter,
  ImageUp,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquareText,
  Mic,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { supabase, supabaseUser } from "./lib/supabase";
import LandingPage from "./pages/LandingPage";
import ContentPage from "./pages/ContentPage";

const workflowSteps = [
  { id: "source", label: "지원 자료", caption: "공고와 문항", tone: "sky" },
  { id: "design", label: "문항 설계", caption: "근거와 규칙", tone: "lemon" },
  {
    id: "editor",
    label: "초안과 피드백",
    caption: "문장 단위 수정",
    tone: "lilac",
  },
  { id: "complete", label: "완료", caption: "최종 체크", tone: "mint" },
];

const statusOptions = [
  "지원 예정",
  "제출",
  "서류합격",
  "면접",
  "최종합격",
  "불합격",
];
const blankData = {
  profile: null,
  experiences: [],
  archiveItems: [],
  essays: [],
  applications: [],
  interview: {
    clusters: [],
    answerAssets: [],
    sets: [],
    questions: [],
    weakSpots: [],
  },
};
const blankStar = { situation: "", task: "", action: "", result: "" };

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

async function api(path, options = {}) {
  const auth = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const token = auth.data?.session?.access_token;
  const response = await fetch(path, {
    ...options,
    headers: options.body
      ? {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        }
      : {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || "요청을 처리하지 못했습니다.");
  return body;
}

function relativeTime(value) {
  if (!value) return "-";
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return "방금";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  return `${Math.floor(seconds / 86400)}일 전`;
}

function useUnsavedWarning(isDirty) {
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
}

function Button({
  children,
  className,
  variant = "default",
  icon: Icon,
  ...props
}) {
  return (
    <button className={cn("button", `button-${variant}`, className)} {...props}>
      {Icon && <Icon size={16} strokeWidth={1.8} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

function IconButton({ label, children, className, ...props }) {
  return (
    <button
      className={cn("icon-button", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

function Chip({ children, tone = "material", removable, onRemove }) {
  return (
    <span className={cn("chip", `chip-${tone}`)}>
      {children}
      {removable && (
        <button aria-label={`${children} 제거`} onClick={onRemove}>
          <X size={12} />
        </button>
      )}
    </span>
  );
}

function Field({ label, value, onChange, textarea, ...props }) {
  const Component = textarea ? "textarea" : "input";
  return (
    <label className={cn("field-group", textarea && "field-wide")}>
      <span>{label}</span>
      <Component
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}

// Read-only / editable right-side panel — replaces gray-dim modal overlays app-wide.
// Main content stays visible behind it (no dark backdrop); closes via the X button
// or a click outside the panel.
function SidePanel({ open, onClose, eyebrow, title, children, footer, wide }) {
  if (!open) return null;
  return (
    <div
      className="side-panel-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside className={cn("side-panel", wide && "side-panel-wide")}>
        <div className="side-panel-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <IconButton label="닫기" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="side-panel-body">{children}</div>
        {footer && <div className="side-panel-footer">{footer}</div>}
      </aside>
    </div>
  );
}

function AppHeader({
  page,
  onNavigate,
  user,
  onLogout,
  mobileOpen,
  setMobileOpen,
}) {
  const nav = [
    ["archive", "Archive", LayoutDashboard],
    ["writing", "Writing", FilePenLine],
    ["interview", "Interview", Mic],
    ["tracking", "State", Target],
  ];
  return (
    <header className="app-header no-print">
      <button className="header-brand" onClick={() => onNavigate("archive")}>
        <Cloud size={21} fill="currentColor" />
        <span>Wish Port</span>
      </button>
      <nav
        className={cn("main-nav", mobileOpen && "is-open")}
        aria-label="주요 메뉴"
      >
        {nav.map(([id, label, Icon]) => (
          <button
            key={id}
            className={page === id ? "active" : ""}
            onClick={() => {
              onNavigate(id);
              setMobileOpen(false);
            }}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="header-account">
        <div className="account-copy">
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
        </div>
        <button className="avatar-button" title="로그아웃" onClick={onLogout}>
          {user?.picture ? (
            <img src={user.picture} alt="" />
          ) : (
            <CircleUserRound size={22} />
          )}
          <LogOut size={13} className="logout-mark" />
        </button>
        <IconButton
          label="메뉴"
          className="mobile-menu"
          onClick={() => setMobileOpen((value) => !value)}
        >
          <Menu size={20} />
        </IconButton>
      </div>
    </header>
  );
}

function FocusHeader({
  title,
  status,
  onHome,
  onBack,
  actionLabel,
  onAction,
  busy,
  finalAction = false,
  actionDisabled = false,
  cloudAction = false,
}) {
  return (
    <header className="focus-header">
      <div className="focus-side focus-left">
        <IconButton
          label="Writing 홈"
          className="cloud-home"
          onClick={() => {
            window.dispatchEvent(new Event("wishport:flush"));
            onHome();
          }}
        >
          <Cloud size={18} fill="currentColor" />
        </IconButton>
        <Button icon={ArrowLeft} onClick={onBack}>
          이전 단계
        </Button>
      </div>
      <div className="focus-title">
        <strong>{title}</strong>
        <span>{status}</span>
      </div>
      <div className="focus-side focus-right">
        <Button
          variant={finalAction ? "complete" : "primary"}
          icon={
            busy
              ? LoaderCircle
              : cloudAction
                ? Cloud
                : finalAction
                  ? Check
                  : ArrowRight
          }
          className={cn(busy && "is-loading", cloudAction && "cloud-primary")}
          onClick={onAction}
          disabled={busy || actionDisabled}
        >
          {actionLabel}
        </Button>
      </div>
    </header>
  );
}

function ProgressRail({ essay, current, onStep, expanded, setExpanded }) {
  const details = {
    source: `${essay.questions.length}개 문항 · 지원 자료 저장됨`,
    design: `${essay.questions.reduce((count, item) => count + item.selectedExperienceIds.length, 0)}개 경험 연결`,
    editor: `${essay.questions.filter((item) => item.draft).length}개 초안 작성`,
    complete: essay.status === "완료" ? "작성 완료" : "최종 확인 전",
  };
  return (
    <aside className="progress-rail" aria-label="진행 단계">
      <div className="rail-line" />
      {workflowSteps.map((step, index) => {
        const accessible = index <= essay.maxStep;
        const done = index < essay.maxStep || essay.maxStep === 3;
        const active = step.id === current;
        const open = expanded === step.id;
        return (
          <div
            className={cn(
              "rail-step",
              active && "active",
              done && "done",
              !accessible && "locked",
              `tone-${step.tone}`,
            )}
            key={step.id}
          >
            <button
              className="rail-step-button"
              aria-expanded={open}
              aria-disabled={!accessible}
              onClick={() => {
                setExpanded(open ? "" : step.id);
                if (accessible && step.id !== "complete") onStep(step.id);
              }}
            >
              <span className="rail-dot">
                {done ? <Check size={13} /> : index + 1}
              </span>
              <span className="rail-label">
                <strong>{step.label}</strong>
                <small>{step.caption}</small>
              </span>
              <ChevronDown size={15} className={cn(open && "rotate")} />
            </button>
            {open && <div className="rail-detail">{details[step.id]}</div>}
          </div>
        );
      })}
    </aside>
  );
}

function Landing({ config, onSignedIn, notify }) {
  const googleRef = useRef(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!config.googleClientId) return undefined;
    const setup = () => {
      if (!window.google?.accounts?.id || !googleRef.current) return;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async ({ credential }) => {
          setLoading(true);
          try {
            const body = await api("/api/auth/google", {
              method: "POST",
              body: JSON.stringify({ credential }),
            });
            onSignedIn(body.user);
          } catch (error) {
            notify(error.message);
          } finally {
            setLoading(false);
          }
        },
      });
      googleRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
        locale: "ko",
      });
    };
    if (window.google?.accounts?.id) {
      setup();
      return undefined;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = setup;
    document.head.appendChild(script);
    return () => script.remove();
  }, [config.googleClientId, notify, onSignedIn]);

  const handleGoogleLogin = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) notify(error.message);
      return;
    }
    notify("Supabase 환경변수가 없어 데모 로그인으로 연결합니다.");
    const body = await api("/api/auth/demo", { method: "POST" });
    onSignedIn(body.user);
  };

  return (
    <main className="landing-page">
      <div className="cloud-mark cloud-one">
        <Cloud />
      </div>
      <div className="cloud-mark cloud-two">
        <Cloud />
      </div>
      <section className="landing-content">
        <div className="landing-kicker">
          <Cloud size={17} fill="currentColor" /> Career Context Workspace
        </div>
        <h1>Wish Port</h1>
        <p>
          흩어진 경험을 한 번 정리하고,
          <br />
          필요한 순간에 다시 꺼내 쓰세요.
        </p>
        <div className="landing-flow">
          {["ARCHIVE", "SELECT", "WRITE", "REFINE", "TRACK"].map(
            (item, index) => (
              <span key={item}>
                {item}
                {index < 4 && <ArrowRight size={12} />}
              </span>
            ),
          )}
        </div>
        <div className="login-area">
          {config.googleClientId && (
            <div
              ref={googleRef}
              className={cn("google-slot", loading && "loading")}
            />
          )}
          {(config.demoAuthEnabled || supabase) && (
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              icon={loading ? LoaderCircle : CircleUserRound}
              className={loading ? "is-loading" : ""}
            >
              구글 계정으로 계속하기
            </Button>
          )}
        </div>
        <small>Archive가 기억하고, AI가 해석하고, 사용자가 선택합니다.</small>
      </section>
    </main>
  );
}

function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading no-print">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

function ResumeSection({ title, meta, children }) {
  return (
    <section className="standard-resume-section">
      <div className="standard-section-title">
        <h3>{title}</h3>
        {meta && <span>{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function ArchiveOverview({ data, onEdit }) {
  const { profile, experiences, archiveItems } = data;
  const achievements = archiveItems.filter(
    (item) => item.kind === "achievement",
  );
  const assets = archiveItems.filter((item) => item.kind === "asset");
  const educations =
    profile.educations?.length
      ? profile.educations
      : profile.school || profile.major || profile.educationPeriod
        ? [
            {
              school: profile.school,
              major: profile.major,
              gpa: profile.gpa,
              startedAt: profile.educationPeriod,
              endedAt: "",
              description: "",
            },
          ]
        : [];
  const careers =
    profile.careers?.length
      ? profile.careers
      : profile.careerTitle || profile.careerSummary || profile.careerPeriod
        ? [
            {
              company: profile.careerTitle,
              role: "",
              startedAt: profile.careerPeriod,
              endedAt: "",
              summary: profile.careerSummary,
            },
          ]
        : [];
  const dateRange = (startedAt, endedAt) =>
    [startedAt, endedAt].filter(Boolean).join(" - ");
  const itemMeta = (item) =>
    [item.grade, item.issuer, item.acquiredAt].filter(Boolean).join(" · ");
  const downloadArchive = (format) => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      experiences,
      achievements,
      assets,
    };
    const lines = [
      `Wish Port Career Archive - ${profile.name}`,
      `Exported: ${exportData.exportedAt}`,
      "",
      "[PROFILE]",
      ...Object.entries(profile)
        .filter(([key]) => key !== "photoData")
        .map(([key, value]) => `${key}: ${value || ""}`),
      "",
      "[EXPERIENCES]",
      ...experiences.flatMap((item, index) => [
        `${index + 1}. ${item.title} (${item.meta})`,
        `Summary: ${item.summary}`,
        `Evidence: ${item.evidence}`,
        `S: ${item.star?.situation || ""}`,
        `T: ${item.star?.task || ""}`,
        `A: ${item.star?.action || ""}`,
        `R: ${item.star?.result || ""}`,
        `Tags: ${item.chips.map(([label, tone]) => `${tone}:${label}`).join(", ")}`,
        "",
      ]),
      "[LANGUAGE & CERTIFICATIONS]",
      ...achievements.map(
        (item) => `${item.title}: ${itemMeta(item)} ${item.detail || ""}`,
      ),
      "",
      "[AWARDS & EDUCATION]",
      ...assets.map(
        (item) => `${item.title}: ${itemMeta(item)} ${item.detail || ""}`,
      ),
    ];
    const content =
      format === "json"
        ? JSON.stringify(exportData, null, 2)
        : lines.join("\n");
    const blob = new Blob([content], {
      type:
        format === "json"
          ? "application/json;charset=utf-8"
          : "text/plain;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wish-port-${profile.name || "archive"}.${format}`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="content-page archive-overview-page">
      <PageHeading
        eyebrow="CAREER ARCHIVE"
        title="Resume Overview"
        description="편집 내용이 반영된 읽기 전용 이력서입니다."
        actions={
          <>
            <Button icon={Download} onClick={() => downloadArchive("json")}>
              JSON
            </Button>
            <Button icon={Download} onClick={() => downloadArchive("txt")}>
              TXT
            </Button>
            <Button icon={Printer} onClick={() => window.print()}>
              PDF로 인쇄
            </Button>
            <Button
              variant="primary"
              className="cloud-primary"
              icon={Cloud}
              onClick={onEdit}
            >
              아카이브 편집
            </Button>
          </>
        }
      />
      <article className="standard-resume" aria-label="한 페이지 이력서">
        <header className="standard-resume-header">
          <div
            className={cn("standard-photo", profile.photoData && "has-photo")}
          >
            {profile.photoData ? (
              <img src={profile.photoData} alt={`${profile.name} 증명사진`} />
            ) : (
              "PHOTO"
            )}
          </div>
          <div className="standard-identity">
            <h1>{profile.name}</h1>
            <h2>{profile.role}</h2>
            <div className="standard-contact">
              <span>{profile.email}</span>
              <span>{profile.phone}</span>
              <span>{profile.location}</span>
              <span>{profile.website}</span>
              <span>{profile.github}</span>
            </div>
          </div>
        </header>
        <div className="standard-resume-body">
          <ResumeSection title="Education" meta={`${educations.length} entries`}>
            {educations.length ? (
              educations.map((education, index) => (
                <div className="resume-entry" key={education.id || index}>
                  <div>
                    <strong>{education.school || "학교명을 입력해 주세요"}</strong>
                    <span>
                      {[education.major, education.degree]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {education.description && <p>{education.description}</p>}
                  </div>
                  <b>
                    {[dateRange(education.startedAt, education.endedAt), education.gpa && `GPA ${education.gpa}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </b>
                </div>
              ))
            ) : (
              <div className="compact-entry">
                <span>학력 정보를 입력해 주세요.</span>
              </div>
            )}
          </ResumeSection>
          <ResumeSection title="Career" meta={`${careers.length} entries`}>
            {careers.length ? (
              careers.map((career, index) => (
                <div
                  className="resume-entry resume-entry-copy"
                  key={career.id || index}
                >
                  <div>
                    <strong>
                      {[career.company, career.role].filter(Boolean).join(" · ") ||
                        "경력 정보를 입력해 주세요"}
                    </strong>
                    <p>{career.summary}</p>
                  </div>
                  <b>{dateRange(career.startedAt, career.endedAt)}</b>
                </div>
              ))
            ) : (
              <div className="compact-entry">
                <span>경력 정보를 입력해 주세요.</span>
              </div>
            )}
          </ResumeSection>
          <ResumeSection
            title="Projects"
            meta={`${experiences.length} experiences`}
          >
            <div className="standard-project-list">
              {experiences.map((experience) => (
                <div className="standard-project" key={experience.id}>
                  <div className="standard-project-head">
                    <strong>{experience.title}</strong>
                    <span>{experience.meta}</span>
                  </div>
                  <p>{experience.summary}</p>
                  <div className="standard-tags">
                    {experience.chips.slice(0, 4).map(([label, tone]) => (
                      <Chip tone={tone} key={`${tone}-${label}`}>
                        {label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ResumeSection>
          <div className="standard-bottom-grid">
            <ResumeSection title="Language · Certifications">
              {achievements.map((item) => (
                <div className="compact-entry" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{itemMeta(item) || item.detail}</span>
                </div>
              ))}
            </ResumeSection>
            <ResumeSection title="Awards · Education">
              {assets.map((item) => (
                <div className="compact-entry" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{itemMeta(item) || item.detail}</span>
                </div>
              ))}
            </ResumeSection>
          </div>
        </div>
      </article>
    </div>
  );
}

function ArchiveSidebar({
  data,
  selection,
  onSelect,
  onNewExperience,
  onNewItem,
  onDeleteExperience,
  onDeleteItem,
}) {
  const basics = [
    ["personal", "인적사항", UserRound],
    ["photo", "증명사진", ImageUp],
    ["education", "학력", GraduationCap],
    ["career", "경력", BriefcaseBusiness],
    ["web", "웹사이트 · 링크", Globe2],
  ];
  const row = (id, type, title, Icon, onDelete) => (
    <div
      className={cn(
        "archive-nav-row",
        selection.type === type && selection.id === id && "active",
      )}
      key={id}
    >
      <button onClick={() => onSelect({ type, id })}>
        {Icon && <Icon size={14} />}
        <span>{title}</span>
      </button>
      {onDelete && (
        <IconButton
          label={`${title} 삭제`}
          className="danger-action"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </IconButton>
      )}
    </div>
  );
  return (
    <aside className="archive-editor-sidebar">
      <div className="archive-nav-group">
        <span className="eyebrow">BASIC PROFILE</span>
        {basics.map(([id, title, Icon]) => row(id, "profile", title, Icon))}
      </div>
      <div className="archive-nav-group">
        <div className="archive-nav-title">
          <span className="eyebrow">EXPERIENCES</span>
          <IconButton label="경험 추가" onClick={onNewExperience}>
            <Plus size={14} />
          </IconButton>
        </div>
        {data.experiences.map((item) =>
          row(item.id, "experience", item.title, null, () =>
            onDeleteExperience(item),
          ),
        )}
      </div>
      <div className="archive-nav-group">
        <div className="archive-nav-title">
          <span className="eyebrow">어학성적/자격증</span>
          <IconButton
            label="어학성적/자격증 추가"
            onClick={() => onNewItem("achievement")}
          >
            <Plus size={14} />
          </IconButton>
        </div>
        {data.archiveItems
          .filter((item) => item.kind === "achievement")
          .map((item) =>
            row(item.id, "item", item.title, null, () => onDeleteItem(item)),
          )}
      </div>
      <div className="archive-nav-group">
        <div className="archive-nav-title">
          <span className="eyebrow">수상 경력/교육사항</span>
          <IconButton
            label="수상 경력/교육사항 추가"
            onClick={() => onNewItem("asset")}
          >
            <Plus size={14} />
          </IconButton>
        </div>
        {data.archiveItems
          .filter((item) => item.kind === "asset")
          .map((item) =>
            row(item.id, "item", item.title, null, () => onDeleteItem(item)),
          )}
      </div>
    </aside>
  );
}

function ProfileEditor({ profile, section, onSave }) {
  const [form, setForm] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setForm(profile);
    setDirty(false);
  }, [profile, section]);
  useUnsavedWarning(dirty);
  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const updateList = (key, index, field, value) => {
    setForm((current) => ({
      ...current,
      [key]: (current[key] || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    setDirty(true);
  };
  const addListItem = (key, item) => {
    setForm((current) => ({ ...current, [key]: [...(current[key] || []), item] }));
    setDirty(true);
  };
  const removeListItem = (key, index) => {
    setForm((current) => ({
      ...current,
      [key]: (current[key] || []).filter((_, itemIndex) => itemIndex !== index),
    }));
    setDirty(true);
  };
  const configs = {
    personal: {
      eyebrow: "PERSONAL",
      title: "인적사항",
      description: "이력서 상단에 표시할 기본 연락처입니다.",
      fields: [
        ["name", "이름"],
        ["role", "직무 / 소개"],
        ["email", "이메일"],
        ["phone", "전화번호"],
        ["location", "지역"],
      ],
    },
    education: {
      eyebrow: "EDUCATION",
      title: "학력",
      description: "학교, 전공과 재학 기간을 관리합니다.",
      fields: [
        ["school", "학교명"],
        ["major", "전공"],
        ["gpa", "학점"],
        ["educationPeriod", "재학 기간"],
      ],
    },
    career: {
      eyebrow: "CAREER",
      title: "경력",
      description: "대표 경력과 담당 업무를 정리합니다.",
      fields: [
        ["careerTitle", "회사 / 역할"],
        ["careerPeriod", "근무 기간"],
        ["careerSummary", "담당 업무", true],
      ],
    },
    web: {
      eyebrow: "LINKS",
      title: "웹사이트 · 링크",
      description: "채용 담당자가 확인할 포트폴리오와 개발 링크입니다.",
      fields: [
        ["website", "포트폴리오"],
        ["github", "GitHub"],
      ],
    },
  };
  const config = configs[section] || configs.personal;
  const save = async () => {
    setBusy(true);
    try {
      await onSave(form);
      setDirty(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <EditorCanvas
      eyebrow={config.eyebrow}
      title={config.title}
      description="먼저 질문에 답하듯 채우고, 필요한 값만 직접 보충하세요."
      actions={
        <Button
          variant="primary"
          icon={busy ? LoaderCircle : Save}
          className={busy ? "is-loading" : ""}
          onClick={save}
          disabled={busy || !dirty}
        >
          변경 저장
        </Button>
      }
    >
      <div className="guided-input-banner">
        <Sparkles size={17} />
        <div>
          <strong>{config.description}</strong>
          <span>입력한 내용은 Resume overview와 자기소개서 소재 추천에 함께 사용됩니다.</span>
        </div>
      </div>
      {section === "education" ? (
        <RepeatableProfileList
          type="education"
          items={form.educations || []}
          onAdd={() =>
            addListItem("educations", {
              school: "",
              major: "",
              degree: "",
              gpa: "",
              startedAt: "",
              endedAt: "",
              description: "",
            })
          }
          onRemove={(index) => removeListItem("educations", index)}
          onChange={(index, field, value) =>
            updateList("educations", index, field, value)
          }
        />
      ) : section === "career" ? (
        <RepeatableProfileList
          type="career"
          items={form.careers || []}
          onAdd={() =>
            addListItem("careers", {
              company: "",
              role: "",
              startedAt: "",
              endedAt: "",
              summary: "",
            })
          }
          onRemove={(index) => removeListItem("careers", index)}
          onChange={(index, field, value) =>
            updateList("careers", index, field, value)
          }
        />
      ) : (
        <div className={cn("form-grid", section === "personal" && "compact-form-grid")}>
          {config.fields.map(([key, label, textarea]) => (
            <Field
              key={key}
              label={label}
              textarea={textarea}
              value={form[key]}
              onChange={(value) => set(key, value)}
            />
          ))}
        </div>
      )}
    </EditorCanvas>
  );
}

function RepeatableProfileList({ type, items, onAdd, onRemove, onChange }) {
  const isEducation = type === "education";
  const emptyMessage = isEducation
    ? "학교별 학력을 추가해 주세요."
    : "회사별 경력을 추가해 주세요.";
  return (
    <div className="repeatable-profile-list">
      {!items.length && <div className="empty-repeatable">{emptyMessage}</div>}
      {items.map((item, index) => (
        <div className="repeatable-card" key={item.id || index}>
          <div className="repeatable-card-head">
            <strong>{isEducation ? `학력 ${index + 1}` : `경력 ${index + 1}`}</strong>
            <IconButton label="삭제" onClick={() => onRemove(index)}>
              <Trash2 size={14} />
            </IconButton>
          </div>
          <div className="form-grid compact-form-grid">
            {isEducation ? (
              <>
                <Field label="학교명" value={item.school} onChange={(value) => onChange(index, "school", value)} />
                <Field label="전공" value={item.major} onChange={(value) => onChange(index, "major", value)} />
                <Field label="학위/상태" value={item.degree} onChange={(value) => onChange(index, "degree", value)} />
                <Field label="학점" value={item.gpa} onChange={(value) => onChange(index, "gpa", value)} />
              </>
            ) : (
              <>
                <Field label="회사명" value={item.company} onChange={(value) => onChange(index, "company", value)} />
                <Field label="직무/역할" value={item.role} onChange={(value) => onChange(index, "role", value)} />
              </>
            )}
            <Field label={isEducation ? "입학" : "입사"} value={item.startedAt} onChange={(value) => onChange(index, "startedAt", value)} placeholder="YYYY.MM" />
            <Field label={isEducation ? "졸업" : "퇴사"} value={item.endedAt} onChange={(value) => onChange(index, "endedAt", value)} placeholder="YYYY.MM" />
            <Field
              textarea
              label={isEducation ? "설명" : "담당 업무"}
              value={isEducation ? item.description : item.summary}
              onChange={(value) => onChange(index, isEducation ? "description" : "summary", value)}
            />
          </div>
        </div>
      ))}
      <Button icon={Plus} onClick={onAdd}>
        {isEducation ? "학력 추가" : "경력 추가"}
      </Button>
    </div>
  );
}

function PhotoEditor({ profile, onSave, notify }) {
  const [photoData, setPhotoData] = useState(profile.photoData || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setPhotoData(profile.photoData || ""), [profile.photoData]);
  const pickPhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return notify("이미지 파일만 업로드할 수 있습니다.");
    if (file.size > 2_500_000)
      return notify("사진은 2.5MB 이하로 올려 주세요.");
    const reader = new FileReader();
    reader.onload = () => setPhotoData(String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  const save = async () => {
    setBusy(true);
    try {
      await onSave({ ...profile, photoData });
    } finally {
      setBusy(false);
    }
  };
  return (
    <EditorCanvas
      eyebrow="PROFILE PHOTO"
      title="증명사진"
      description="이력서 왼쪽 상단에 표시할 세로형 프로필 사진을 등록합니다."
      actions={
        <Button
          variant="primary"
          icon={busy ? LoaderCircle : Save}
          className={busy ? "is-loading" : ""}
          onClick={save}
          disabled={busy || photoData === (profile.photoData || "")}
        >
          사진 저장
        </Button>
      }
    >
      <div className="photo-editor">
        <div className={cn("photo-preview", photoData && "has-photo")}>
          {photoData ? (
            <img src={photoData} alt="업로드한 증명사진 미리보기" />
          ) : (
            <ImageUp size={34} />
          )}
        </div>
        <div className="photo-controls">
          <label className="photo-upload">
            <ImageUp size={18} />
            <span>사진 선택</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => pickPhoto(event.target.files?.[0])}
            />
          </label>
          <p>JPG, PNG, WebP · 최대 2.5MB · 3:4 비율 권장</p>
          {photoData && (
            <Button icon={Trash2} onClick={() => setPhotoData("")}>
              사진 제거
            </Button>
          )}
        </div>
      </div>
    </EditorCanvas>
  );
}

const archiveInterviewQuestions = [
  ["project", "어떤 프로젝트나 경험이었나요?", "예: 교내 회의실 예약 서비스 Erooming"],
  ["context", "그때 어떤 상황이었나요?", "팀, 기간, 배경을 편하게 적어주세요."],
  ["problem", "가장 어려웠던 문제는 뭐였나요?", "일정, 협업, 기술, 사용자 문제 등"],
  ["action", "본인이 직접 한 행동은 뭐였나요?", "내가 판단하고 실행한 일을 중심으로"],
  ["result", "결과나 배운 점은 무엇이었나요?", "수치가 없으면 변화나 깨달음도 좋아요."],
];

function ArchiveInterviewPanel({ onApply, notify }) {
  const [answers, setAnswers] = useState(
    Object.fromEntries(archiveInterviewQuestions.map(([key]) => [key, ""])),
  );
  const [busy, setBusy] = useState(false);
  const hasAnswer = Object.values(answers).some((value) => value.trim());
  const update = (key, value) =>
    setAnswers((current) => ({ ...current, [key]: value }));
  const generate = async () => {
    if (!hasAnswer) return notify("경험에 대해 한 가지 이상 답변해 주세요.");
    setBusy(true);
    try {
      const body = await api("/api/llm/archive-experience", {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      onApply(body.experience);
      notify(
        body.provider === "gemini"
          ? "Gemini가 경험 초안을 정리했습니다."
          : "경험 초안을 정리했습니다.",
      );
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="archive-interview-panel">
      <div className="archive-interview-head">
        <div>
          <span className="eyebrow">AI INTERVIEW</span>
          <h3>질문으로 Archive 채우기</h3>
        </div>
        <Button
          variant="primary"
          icon={busy ? LoaderCircle : Sparkles}
          className={busy ? "is-loading" : ""}
          onClick={generate}
          disabled={busy || !hasAnswer}
        >
          경험 구조화
        </Button>
      </div>
      <div className="archive-interview-grid">
        {archiveInterviewQuestions.map(([key, label, placeholder]) => (
          <label className="archive-interview-question" key={key}>
            <span>{label}</span>
            <textarea
              value={answers[key]}
              placeholder={placeholder}
              onChange={(event) => update(key, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function ExperienceEditor({ experience, onSave, isNew, notify }) {
  const [form, setForm] = useState(
    experience || {
      title: "",
      meta: "",
      summary: "",
      evidence: "",
      star: blankStar,
      chips: [],
    },
  );
  const [busy, setBusy] = useState(false);
  useEffect(
    () =>
      setForm(
        experience || {
          title: "",
          meta: "",
          summary: "",
          evidence: "",
          star: blankStar,
          chips: [],
        },
      ),
    [experience],
  );
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const setStar = (key, value) =>
    setForm((current) => ({
      ...current,
      star: { ...current.star, [key]: value },
    }));
  const chipByTone = (tone) =>
    form.chips.find((item) => item[1] === tone)?.[0] || "";
  const setChip = (tone, value) =>
    setForm((current) => ({
      ...current,
      chips: [
        ...current.chips.filter((item) => item[1] !== tone),
        ...(value.trim() ? [[value, tone]] : []),
      ],
    }));
  const save = async () => {
    setBusy(true);
    try {
      await onSave(form);
    } finally {
      setBusy(false);
    }
  };
  return (
    <EditorCanvas
      eyebrow="EXPERIENCE"
      title={isNew ? "새 경험 추가" : experience.title}
      description="프로젝트 정보와 자기소개서 근거로 사용할 STAR 내용을 함께 저장합니다."
      actions={
        <Button
          variant="primary"
          icon={busy ? LoaderCircle : Save}
          className={busy ? "is-loading" : ""}
          onClick={save}
          disabled={busy || !form.title.trim()}
        >
          경험 저장
        </Button>
      }
    >
      <ArchiveInterviewPanel
        notify={notify}
        onApply={(experienceDraft) =>
          setForm((current) => ({ ...current, ...experienceDraft }))
        }
      />
      <div className="manual-supplement-head">
        <span className="eyebrow">DIRECT EDIT</span>
        <h3>직접 보충하기</h3>
        <p>AI가 정리한 초안을 확인한 뒤, 사실관계와 표현을 직접 다듬으세요.</p>
      </div>
      <div className="form-grid">
        <Field
          label="프로젝트명"
          value={form.title}
          onChange={(value) => set("title", value)}
        />
        <Field
          label="역할 · 유형"
          value={form.meta}
          onChange={(value) => set("meta", value)}
        />
        <Field
          textarea
          label="이력서용 요약"
          value={form.summary}
          onChange={(value) => set("summary", value)}
        />
        <Field
          textarea
          label="원본 근거"
          value={form.evidence}
          onChange={(value) => set("evidence", value)}
        />
      </div>
      <div className="editor-subsection">
        <div>
          <span className="eyebrow">STAR EVIDENCE</span>
          <h3>문항 작성 근거</h3>
        </div>
        <div className="star-form-grid">
          {[
            ["situation", "S · Situation", "어떤 상황이었나요?"],
            ["task", "T · Task", "해결해야 한 과제는?"],
            ["action", "A · Action", "직접 한 행동은?"],
            ["result", "R · Result", "확인된 결과는?"],
          ].map(([key, label, placeholder]) => (
            <Field
              textarea
              key={key}
              label={label}
              placeholder={placeholder}
              value={form.star?.[key]}
              onChange={(value) => setStar(key, value)}
            />
          ))}
        </div>
      </div>
      <div className="editor-subsection">
        <span className="eyebrow">STRUCTURED TAGS</span>
        <div className="context-field-grid">
          {[
            ["material", "Material"],
            ["result", "Result"],
            ["skill", "Skill"],
            ["output", "Output"],
          ].map(([tone, label]) => (
            <label className={`context-field tone-${tone}`} key={tone}>
              <span>{label}</span>
              <input
                value={chipByTone(tone)}
                onChange={(event) => setChip(tone, event.target.value)}
              />
            </label>
          ))}
        </div>
      </div>
    </EditorCanvas>
  );
}

function ArchiveItemEditor({ item, kind, onSave, isNew, notify }) {
  const [form, setForm] = useState(
    item || {
      kind,
      title: "",
      detail: "",
      issuer: "",
      grade: "",
      acquiredAt: "",
      fileName: "",
      fileType: "",
      fileData: "",
      ocrText: "",
      tone: kind === "asset" ? "lilac" : "mint",
    },
  );
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  useEffect(
    () =>
      setForm(
        item || {
          kind,
          title: "",
          detail: "",
          issuer: "",
          grade: "",
          acquiredAt: "",
          fileName: "",
          fileType: "",
          fileData: "",
          ocrText: "",
          tone: kind === "asset" ? "lilac" : "mint",
        },
      ),
    [item, kind],
  );
  const save = async () => {
    setBusy(true);
    try {
      await onSave(form);
    } finally {
      setBusy(false);
    }
  };
  const readCertificate = (file) => {
    if (!file) return;
    if (file.size > 5_000_000) {
      notify?.("증빙 파일은 5MB 이하로 올려 주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const fileData = String(reader.result || "");
      setForm((current) => ({
        ...current,
        fileName: file.name,
        fileType: file.type,
        fileData,
      }));
      setOcrBusy(true);
      try {
        const body = await api("/api/llm/archive-item-file", {
          method: "POST",
          body: JSON.stringify({
            kind,
            file: { name: file.name, type: file.type, data: fileData },
          }),
        });
        setForm((current) => ({ ...current, ...body.item }));
        notify?.(
          body.provider === "gemini"
            ? "증빙 파일에서 정보를 추출했습니다."
            : "파일을 첨부했습니다. 필요한 정보는 직접 보충해 주세요.",
        );
      } catch (error) {
        notify?.(error.message);
      } finally {
        setOcrBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };
  const label = kind === "asset" ? "수상 경력 · 교육사항" : "어학성적 · 자격증";
  return (
    <EditorCanvas
      eyebrow={kind === "asset" ? "AWARD · EDUCATION" : "LICENSE · LANGUAGE"}
      title={
        isNew ? `새 ${label}` : item.title
      }
      description="증빙 파일을 올리면 AI가 주요 정보를 먼저 채우고, 사용자가 직접 보정합니다."
      actions={
        <Button
          variant="primary"
          icon={busy ? LoaderCircle : Save}
          className={busy ? "is-loading" : ""}
          onClick={save}
          disabled={busy || !form.title.trim()}
        >
          항목 저장
        </Button>
      }
    >
      <div className="file-ocr-dropzone">
        {ocrBusy ? <LoaderCircle size={20} className="is-loading" /> : <UploadCloud size={20} />}
        <div>
          <strong>{ocrBusy ? "증빙을 읽는 중입니다" : "PDF 또는 이미지 첨부"}</strong>
          <span>
            {kind === "asset"
              ? "수상/교육명, 기관, 수상일/수료일을 자동으로 채웁니다."
              : "자격명, 등급/점수, 기관, 취득일자를 자동으로 채웁니다."}
          </span>
          {form.fileName && <em>{form.fileName}</em>}
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(event) => readCertificate(event.target.files?.[0])}
        />
      </div>
      <div className="form-grid compact-form-grid">
        <Field
          label={kind === "asset" ? "수상/교육명" : "자격명/시험명"}
          value={form.title}
          onChange={(value) =>
            setForm((current) => ({ ...current, title: value }))
          }
        />
        <Field
          label="등급/점수"
          value={form.grade}
          onChange={(value) =>
            setForm((current) => ({ ...current, grade: value }))
          }
        />
        <Field
          label="기관"
          value={form.issuer}
          onChange={(value) =>
            setForm((current) => ({ ...current, issuer: value }))
          }
        />
        <Field
          label="취득/수료일"
          value={form.acquiredAt}
          onChange={(value) =>
            setForm((current) => ({ ...current, acquiredAt: value }))
          }
        />
        <Field
          textarea
          label="세부 정보"
          value={form.detail}
          onChange={(value) =>
            setForm((current) => ({ ...current, detail: value }))
          }
        />
      </div>
    </EditorCanvas>
  );
}

function EditorCanvas({ eyebrow, title, description, actions, children }) {
  return (
    <section className="archive-editor-canvas">
      <div className="editor-canvas-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions}
      </div>
      <div className="editor-canvas-body">{children}</div>
    </section>
  );
}

function ArchiveWorkspacePreview({ data, selection, onSelect, onNewExperience }) {
  const profile = data.profile;
  const selectedExperience = data.experiences.find(
    (item) => item.id === selection.id,
  );
  const previewExperience = selectedExperience || data.experiences[0];
  const achievements = data.archiveItems.filter(
    (item) => item.kind === "achievement",
  );
  const assets = data.archiveItems.filter((item) => item.kind === "asset");
  const nodes = previewExperience
    ? [
        ["S", "상황", previewExperience.star?.situation || previewExperience.summary],
        ["T", "과제", previewExperience.star?.task || previewExperience.evidence],
        ["A", "행동", previewExperience.star?.action || previewExperience.evidence],
        ["R", "결과", previewExperience.star?.result || "결과를 보충해 주세요."],
      ]
    : [];
  return (
    <section className="archive-workspace-preview">
      <div className="archive-preview-topbar">
        <div>
          <span className="eyebrow">LIVE ARCHIVE</span>
          <h2>{profile.name || "내 이름"} Resume Workspace</h2>
        </div>
        <Button icon={Plus} variant="primary" onClick={onNewExperience}>
          경험 추가
        </Button>
      </div>
      <div className="archive-resume-card">
        <div className="archive-resume-photo">
          {profile.photoData ? <img src={profile.photoData} alt="" /> : <UserRound size={28} />}
        </div>
        <div className="archive-resume-intro">
          <h3>{profile.name || "이름을 입력해 주세요"}</h3>
          <p>{profile.role || "지원 직무와 한 줄 소개를 입력해 주세요"}</p>
          <div>
            {[profile.email, profile.phone, profile.location, profile.website]
              .filter(Boolean)
              .map((item) => (
                <span key={item}>{item}</span>
              ))}
          </div>
        </div>
      </div>
      <div className="archive-mindmap-panel">
        {!previewExperience && (
          <div className="archive-mindmap-empty">
            <strong>이곳에 경험이 나타나요</strong>
            <span>오른쪽 질문에 답하면 구조화된 경험 카드가 만들어집니다.</span>
          </div>
        )}
        {previewExperience && (
          <div className="archive-mindmap">
            <button
              className={cn(
                "mindmap-root",
                selection.id === previewExperience.id && "active",
              )}
              onClick={() =>
                onSelect({ type: "experience", id: previewExperience.id })
              }
            >
              <strong>{previewExperience.title}</strong>
              <span>{previewExperience.meta || "Experience"}</span>
            </button>
            <div className="mindmap-branches">
              {nodes.map(([letter, title, copy]) => (
                <button
                  className="mindmap-node"
                  key={letter}
                  onClick={() =>
                    onSelect({ type: "experience", id: previewExperience.id })
                  }
                >
                  <b>{letter}</b>
                  <div>
                    <strong>{title}</strong>
                    <span>{copy}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="archive-preview-bottom">
        <div>
          <span className="eyebrow">EXPERIENCES</span>
          <strong>{data.experiences.length}</strong>
        </div>
        <div>
          <span className="eyebrow">LANGUAGE · LICENSE</span>
          <strong>{achievements.length}</strong>
        </div>
        <div>
          <span className="eyebrow">AWARD · EDUCATION</span>
          <strong>{assets.length}</strong>
        </div>
      </div>
    </section>
  );
}

function ArchiveEditor({
  data,
  initialExperienceId,
  onBack,
  onSaveProfile,
  onSaveExperience,
  onDeleteExperience,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  notify,
}) {
  const [selection, setSelection] = useState(
    initialExperienceId
      ? { type: "experience", id: initialExperienceId }
      : { type: "profile", id: "personal" },
  );
  const selectedExperience = data.experiences.find(
    (item) => item.id === selection.id,
  );
  const selectedItem = data.archiveItems.find(
    (item) => item.id === selection.id,
  );
  const newExperience = selection.type === "new-experience";
  const newItemKind = selection.type === "new-item" ? selection.id : "";
  const removeExperience = async (item) => {
    if (
      !window.confirm(
        `'${item.title}' 경험을 삭제할까요? 연결된 문항에서는 이 경험만 제거됩니다.`,
      )
    )
      return;
    await onDeleteExperience(item.id);
    setSelection({ type: "profile", id: "personal" });
  };
  const removeItem = async (item) => {
    if (!window.confirm(`'${item.title}' 항목을 삭제할까요?`)) return;
    await onDeleteItem(item.id);
    setSelection({ type: "profile", id: "personal" });
  };
  const saveExperience = async (payload) => {
    const saved = await onSaveExperience(payload, selectedExperience?.id);
    setSelection({ type: "experience", id: saved.id });
  };
  const saveItem = async (payload) => {
    const saved = selectedItem
      ? await onUpdateItem(selectedItem.id, payload)
      : await onCreateItem(payload);
    setSelection({ type: "item", id: saved.id });
  };
  let editor =
    selection.type === "profile" && selection.id === "photo" ? (
      <PhotoEditor
        profile={data.profile}
        onSave={onSaveProfile}
        notify={notify}
      />
    ) : (
      <ProfileEditor
        profile={data.profile}
        section={selection.id}
        onSave={onSaveProfile}
      />
    );
  if (selection.type === "experience" || newExperience)
    editor = (
      <ExperienceEditor
        key={selectedExperience?.id || "new"}
        experience={selectedExperience}
        isNew={newExperience}
        onSave={saveExperience}
        notify={notify}
      />
    );
  if (selection.type === "item" || newItemKind)
    editor = (
        <ArchiveItemEditor
        key={selectedItem?.id || newItemKind}
        item={selectedItem}
        kind={selectedItem?.kind || newItemKind}
        isNew={Boolean(newItemKind)}
        onSave={saveItem}
        notify={notify}
      />
    );
  return (
    <div className="focus-page archive-edit-page">
      <FocusHeader
        title="Career Archive Editor"
        status="DB 자동 연동"
        onHome={onBack}
        onBack={onBack}
        actionLabel="편집 완료"
        cloudAction
        onAction={() => {
          notify("Archive 편집을 마쳤습니다.");
          onBack();
        }}
      />
      <div className="archive-editor-layout">
        <ArchiveSidebar
          data={data}
          selection={selection}
          onSelect={setSelection}
          onNewExperience={() =>
            setSelection({ type: "new-experience", id: "new" })
          }
          onNewItem={(kind) => setSelection({ type: "new-item", id: kind })}
          onDeleteExperience={removeExperience}
          onDeleteItem={removeItem}
        />
        <ArchiveWorkspacePreview
          data={data}
          selection={selection}
          onSelect={setSelection}
          onNewExperience={() =>
            setSelection({ type: "new-experience", id: "new" })
          }
        />
        {editor}
      </div>
    </div>
  );
}

function WritingStats({ data }) {
  const chipCount = data.experiences.reduce(
    (count, item) => count + item.chips.length,
    0,
  );
  return (
    <div className="writing-stats">
      <div className="stat stat-sky">
        <span>활용 가능 경험</span>
        <strong>{data.experiences.length}</strong>
      </div>
      <div className="stat stat-lemon">
        <span>구조화 소재</span>
        <strong>{chipCount}</strong>
      </div>
      <div className="stat stat-mint">
        <span>어학 · 자격</span>
        <strong>
          {
            data.archiveItems.filter((item) => item.kind === "achievement")
              .length
          }
        </strong>
      </div>
      <div className="stat stat-lilac">
        <span>수상 · 교육</span>
        <strong>
          {data.archiveItems.filter((item) => item.kind === "asset").length}
        </strong>
      </div>
    </div>
  );
}

function WritingHouse({ data, onNew, onOpen, onDelete }) {
  const [viewEssay, setViewEssay] = useState(null);
  const progress = (essay) =>
    essay.status === "완료" ? 100 : Math.min(90, 16 + essay.maxStep * 34);
  const stage = (essay) =>
    essay.status === "완료"
      ? "완료"
      : workflowSteps[Math.min(essay.currentStep, 2)].label;
  return (
    <div className="content-page">
      <PageHeading
        eyebrow="WRITING WORKSPACE"
        title="Essay List"
        description="Archive의 근거를 선택해 기업·직무별 자기소개서를 작성합니다."
        actions={
          <Button
            variant="primary"
            className="cloud-primary"
            icon={Cloud}
            onClick={onNew}
          >
            자기소개서 만들기
          </Button>
        }
      />
      <WritingStats data={data} />
      <div className="document-grid">
        {data.essays.map((essay) => (
          <article
            className="document-card"
            key={essay.id}
            onClick={() => onOpen(essay)}
          >
            <div className="document-card-head">
              <div className="document-icon tone-lilac">
                <FileText size={20} />
              </div>
              <div className="document-actions">
                <Chip tone={essay.status === "완료" ? "skill" : "output"}>
                  {stage(essay)}
                </Chip>
                <IconButton
                  label="자기소개서 삭제"
                  className="danger-action"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(essay);
                  }}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </div>
            <div>
              <span className="eyebrow">{essay.company}</span>
              <h2>{essay.role} 자기소개서</h2>
              <p>최근 수정 {relativeTime(essay.updatedAt)}</p>
            </div>
            <div className="document-progress">
              <div>
                <span>진행률</span>
                <strong>{progress(essay)}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${progress(essay)}%` }} />
              </div>
            </div>
            <div className="document-card-cta">
              <Button
                icon={BookOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setViewEssay(essay);
                }}
              >
                자기소개서 보기
              </Button>
            </div>
            <div className="document-footer">
              <span>
                {essay.questions.length}개 문항 ·{" "}
                {essay.questions.filter((item) => item.draft).length}개 초안
              </span>
              <ChevronRight size={18} />
            </div>
          </article>
        ))}
        <button className="new-document-card" onClick={onNew}>
          <Cloud size={23} fill="currentColor" />
          <strong>새 자기소개서</strong>
          <span>지원 자료에서 시작</span>
        </button>
      </div>
      <EssaySidePanel
        essay={viewEssay}
        onClose={() => setViewEssay(null)}
        onEdit={(essay) => {
          setViewEssay(null);
          onOpen(essay);
        }}
      />
    </div>
  );
}

// Read-only Essay Q&A viewer, reused from Writing (Essay List cards) and from
// Process Tracking (Essay column "보기" action). `onEdit` navigates into the
// actual editable Writing workflow for that essay ("Full Edit → 해당 Main Feature").
function EssaySidePanel({ essay, onClose, onEdit, editLabel = "Writing에서 편집" }) {
  return (
    <SidePanel
      open={!!essay}
      onClose={onClose}
      eyebrow={essay?.company}
      title={essay ? `${essay.role} 자기소개서` : ""}
      footer={
        essay && (
          <Button
            variant="primary"
            className="cloud-primary"
            icon={FileText}
            onClick={() => onEdit(essay)}
          >
            {editLabel}
          </Button>
        )
      }
    >
      {essay?.questions.map((question, index) => (
        <div className="essay-view-item" key={question.id}>
          <span className="eyebrow">Q{index + 1}</span>
          <h3>{question.prompt}</h3>
          <p className={cn("essay-view-answer", !question.draft && "is-empty")}>
            {question.draft || "아직 저장된 답변이 없습니다."}
          </p>
        </div>
      ))}
      {essay && !essay.questions.length && (
        <EmptyState title="등록된 문항이 없습니다." />
      )}
    </SidePanel>
  );
}

// Read-only Interview Set viewer, reused from Interview (Cabinet cards) and from
// Process Tracking (Interview column "보기" action). `onOpen` navigates into
// Interview → Cabinet → that Set ("Full Work → 해당 Main Feature로 이동").
function InterviewSetSidePanel({ set, onClose, onOpen }) {
  return (
    <SidePanel
      open={!!set}
      onClose={onClose}
      eyebrow="INTERVIEW SET"
      title={set?.name || ""}
      wide
      footer={
        set && (
          <Button
            variant="primary"
            className="cloud-primary"
            icon={DoorOpen}
            onClick={() => onOpen(set)}
          >
            Interview에서 열기
          </Button>
        )
      }
    >
      {set && (
        <>
          <div className="side-panel-meta">
            <div>
              <span>Source</span>
              <b>{set.sourceType === "essay" ? "Essay 기반" : "직접 생성"}</b>
            </div>
            <div>
              <span>Readiness</span>
              <b>{set.readiness}%</b>
            </div>
          </div>
          {set.questions.map((question, index) => (
            <div className="side-panel-qa" key={question.id}>
              <span className="eyebrow">Q{index + 1}</span>
              <h4>{question.questionText}</h4>
              <p className={cn("essay-view-answer", !question.answerText && "is-empty")}>
                {question.answerText || "아직 저장된 답변이 없습니다."}
              </p>
            </div>
          ))}
          {!set.questions.length && (
            <EmptyState title="등록된 질문이 없습니다." />
          )}
        </>
      )}
    </SidePanel>
  );
}

function WorkflowPage({
  essay,
  current,
  expanded,
  setExpanded,
  onStep,
  header,
  children,
}) {
  return (
    <div className="focus-page">
      <FocusHeader {...header} />
      <div className="focus-layout">
        <ProgressRail
          essay={essay}
          current={current}
          onStep={onStep}
          expanded={expanded}
          setExpanded={setExpanded}
        />
        <main className="workflow-main">{children}</main>
      </div>
    </div>
  );
}

function FileInput({ value, onChange, label }) {
  return (
    <label className="compact-file-input">
      <UploadCloud size={16} />
      <span>{value || label}</span>
      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={(event) => onChange(event.target.files?.[0]?.name || "")}
      />
    </label>
  );
}

function SourceIntake({
  essay,
  onSaveEssay,
  onSaveQuestion,
  onAddQuestion,
  onDeleteQuestion,
  onHome,
  onBack,
  onNext,
  expanded,
  setExpanded,
  onStep,
  notify,
}) {
  const [form, setForm] = useState({
    company: essay.company,
    role: essay.role,
    sources: essay.sources,
  });
  const [questions, setQuestions] = useState(
    essay.questions.map((item) => ({
      id: item.id,
      prompt: item.prompt,
      charLimit: item.charLimit,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState("저장됨");
  const firstChange = useRef(true);
  useUnsavedWarning(saveState === "변경됨" || saveState === "저장 중...");
  useEffect(() => {
    setForm({
      company: essay.company,
      role: essay.role,
      sources: essay.sources,
    });
    setQuestions(
      essay.questions.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        charLimit: item.charLimit,
      })),
    );
    setSaveState("저장됨");
  }, [essay.id, essay.questions.length]);
  const setSource = (group, key, value) => {
    setForm((current) => ({
      ...current,
      sources: {
        ...current.sources,
        [group]: { ...current.sources[group], [key]: value },
      },
    }));
    setSaveState("변경됨");
  };
  const commit = async () => {
    setSaveState("저장 중...");
    await onSaveEssay({
      company: form.company,
      role: form.role,
      sources: form.sources,
    });
    await Promise.all(
      questions.map((item) =>
        onSaveQuestion(
          item.id,
          { prompt: item.prompt, charLimit: item.charLimit },
          true,
        ),
      ),
    );
    setSaveState("저장됨");
  };
  useEffect(() => {
    if (firstChange.current) {
      firstChange.current = false;
      return undefined;
    }
    setSaveState("변경됨");
    const timer = window.setTimeout(
      () => commit().catch(() => setSaveState("저장 실패")),
      900,
    );
    return () => window.clearTimeout(timer);
  }, [form, questions]);
  useEffect(() => {
    const flush = () => {
      commit().catch(() => setSaveState("저장 실패"));
    };
    window.addEventListener("wishport:flush", flush);
    return () => window.removeEventListener("wishport:flush", flush);
  }, [form, questions]);
  const addQuestion = async () => {
    await commit();
    await onAddQuestion();
  };
  const deleteQuestion = async (id) => {
    await commit();
    await onDeleteQuestion(id);
  };
  const next = async () => {
    setBusy(true);
    try {
      await commit();
      notify("지원 정보와 문항 제목을 동기화했습니다.");
      await onNext();
    } finally {
      setBusy(false);
    }
  };
  const move = async (step) => {
    await commit();
    onStep(step);
  };
  return (
    <WorkflowPage
      essay={essay}
      current="source"
      expanded={expanded}
      setExpanded={setExpanded}
      onStep={move}
      header={{
        title: `${form.company || "기업명"} · ${form.role || "직무"} · 자기소개서`,
        status: saveState,
        onHome,
        onBack: async () => {
          await commit();
          onBack();
        },
        actionLabel: "다음 단계",
        onAction: next,
        busy,
        actionDisabled:
          !form.company.trim() || !form.role.trim() || !questions.length,
      }}
    >
      <div className="workflow-heading">
        <span className="eyebrow">SOURCE INTAKE</span>
        <h1>지원 자료와 문항을 입력하세요.</h1>
        <p>
          기업명과 직무는 Essay List의 자기소개서 제목과 지원 현황에 함께
          반영됩니다.
        </p>
      </div>
      <div className="source-stack">
        <SourceRow
          number="01"
          icon={Target}
          title="지원 정보"
          description="기업 · 직무"
        >
          <div className="inline-inputs">
            <input
              value={form.company}
              placeholder="기업명"
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  company: event.target.value,
                }));
                setSaveState("변경됨");
              }}
            />
            <input
              value={form.role}
              placeholder="직무"
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  role: event.target.value,
                }));
                setSaveState("변경됨");
              }}
            />
          </div>
        </SourceRow>
        <SourceRow
          number="02"
          icon={Link2}
          title="채용 공고"
          description="URL · 파일"
        >
          <div className="source-dual-input">
            <input
              value={form.sources.jobPost.url}
              placeholder="채용 공고 URL"
              onChange={(event) =>
                setSource("jobPost", "url", event.target.value)
              }
            />
            <FileInput
              value={form.sources.jobPost.file}
              label="채용 공고 파일 첨부"
              onChange={(value) => setSource("jobPost", "file", value)}
            />
          </div>
        </SourceRow>
        <SourceRow
          number="03"
          icon={BriefcaseBusiness}
          title="직무기술서"
          description="URL · 파일"
        >
          <div className="source-dual-input">
            <input
              value={form.sources.jobDescription.url}
              placeholder="직무기술서 URL"
              onChange={(event) =>
                setSource("jobDescription", "url", event.target.value)
              }
            />
            <FileInput
              value={form.sources.jobDescription.file}
              label="직무기술서 파일 첨부"
              onChange={(value) => setSource("jobDescription", "file", value)}
            />
          </div>
        </SourceRow>
        <SourceRow
          number="04"
          icon={MessageSquareText}
          title="자기소개서 문항"
          description="문항 · 글자 수"
        >
          <div className="question-input-list">
            {questions.map((question, index) => (
              <div className="question-input-row" key={question.id}>
                <span>Q{index + 1}</span>
                <textarea
                  value={question.prompt}
                  onChange={(event) => {
                    setQuestions((current) =>
                      current.map((item) =>
                        item.id === question.id
                          ? { ...item, prompt: event.target.value }
                          : item,
                      ),
                    );
                    setSaveState("변경됨");
                  }}
                />
                <label>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    step="50"
                    value={question.charLimit}
                    onChange={(event) => {
                      setQuestions((current) =>
                        current.map((item) =>
                          item.id === question.id
                            ? { ...item, charLimit: Number(event.target.value) }
                            : item,
                        ),
                      );
                      setSaveState("변경됨");
                    }}
                  />
                  <span>자</span>
                </label>
                <IconButton
                  label="문항 삭제"
                  className="danger-action"
                  onClick={() => deleteQuestion(question.id)}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))}
            <Button
              icon={Plus}
              onClick={addQuestion}
              disabled={questions.length >= 8}
            >
              문항 추가
            </Button>
          </div>
        </SourceRow>
      </div>
    </WorkflowPage>
  );
}

function SourceRow({ number, icon: Icon, title, description, children }) {
  return (
    <section className="source-row">
      <span className="source-number">{number}</span>
      <div className="source-label">
        <Icon size={18} />
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="source-control">{children}</div>
    </section>
  );
}

function RulesPanel({ essay, onSaveEssay }) {
  const [rules, setRules] = useState(essay.rules);
  const [saved, setSaved] = useState("저장됨");
  useEffect(() => {
    setRules(essay.rules);
    setSaved("저장됨");
  }, [essay.id, essay.rules.blindMode, essay.rules.aiInstructions]);
  const save = async (next = rules) => {
    setSaved("저장 중...");
    await onSaveEssay({ rules: next });
    setSaved("저장됨");
  };
  return (
    <div className="design-side-panel">
      <div className="side-panel-heading">
        <div>
          <span className="eyebrow">WRITING RULES</span>
          <h2>작성 규칙</h2>
        </div>
        <span>{saved}</span>
      </div>
      <label className="toggle-row">
        <div>
          <ShieldCheck size={18} />
          <span>
            <strong>블라인드 채용 모드</strong>
            <small>학교명, 출신지 등 식별 정보를 생성에서 제외</small>
          </span>
        </div>
        <input
          type="checkbox"
          checked={rules.blindMode}
          onChange={(event) => {
            const next = { ...rules, blindMode: event.target.checked };
            setRules(next);
            save(next);
          }}
        />
      </label>
      <label className="rule-editor">
        <span>AI 작성 지침</span>
        <textarea
          value={rules.aiInstructions}
          placeholder="예: 첫 문단은 짧게, 성과보다 행동을 구체적으로 작성"
          onChange={(event) => {
            setRules((current) => ({
              ...current,
              aiInstructions: event.target.value,
            }));
            setSaved("변경됨");
          }}
          onBlur={() => save()}
        />
      </label>
      <div className="rule-preview">
        <strong>적용 방식</strong>
        <p>
          이 규칙은 모든 문항의 신규 생성과 다시 다듬기에 적용됩니다. 기존
          초안은 자동으로 덮어쓰지 않습니다.
        </p>
      </div>
    </div>
  );
}

function ReferencePanel({ essay, onSaveEssay }) {
  const [reference, setReference] = useState(essay.reference);
  const [saved, setSaved] = useState("저장됨");
  useEffect(() => {
    setReference(essay.reference);
    setSaved("저장됨");
  }, [essay.id, essay.reference.file, essay.reference.text]);
  const save = async (next = reference) => {
    setSaved("저장 중...");
    await onSaveEssay({ reference: next });
    setSaved("저장됨");
  };
  return (
    <div className="design-side-panel">
      <div className="side-panel-heading">
        <div>
          <span className="eyebrow">STYLE REFERENCE</span>
          <h2>문체 참고 자료</h2>
        </div>
        <span>{saved}</span>
      </div>
      <FileInput
        value={reference.file}
        label="기존 자기소개서 첨부"
        onChange={(file) => {
          const next = { ...reference, file };
          setReference(next);
          save(next);
        }}
      />
      <label className="rule-editor">
        <span>참고 문장 또는 문체 설명</span>
        <textarea
          value={reference.text}
          placeholder="내가 작성한 문장이나 유지하고 싶은 문체 특징을 입력하세요."
          onChange={(event) => {
            setReference((current) => ({
              ...current,
              text: event.target.value,
            }));
            setSaved("변경됨");
          }}
          onBlur={() => save()}
        />
      </label>
      <div className="rule-preview">
        <strong>사용 범위</strong>
        <p>
          참고 자료는 말투와 문장 길이에만 사용하며, 경험 사실과 성과는 Archive
          근거만 사용합니다.
        </p>
      </div>
    </div>
  );
}

function EssayDesign({
  essay,
  experiences,
  onSelectQuestion,
  onSetContext,
  onSaveEssay,
  onHome,
  onBack,
  onNext,
  expanded,
  setExpanded,
  onStep,
  busy,
}) {
  const [tab, setTab] = useState("archive");
  const activeQuestion =
    essay.questions[essay.activeQuestion] || essay.questions[0];
  const selectedIds = activeQuestion?.selectedExperienceIds || [];
  const selected = selectedIds
    .map((id) => experiences.find((item) => item.id === id))
    .filter(Boolean);
  const setContext = (ids) => onSetContext(activeQuestion.id, ids);
  const addExperience = (item) => {
    if (!selectedIds.includes(item.id)) setContext([...selectedIds, item.id]);
  };
  const onDrop = (event) => {
    event.preventDefault();
    const item = experiences.find(
      (experience) =>
        experience.id === event.dataTransfer.getData("experience"),
    );
    if (item) addExperience(item);
  };
  return (
    <WorkflowPage
      essay={essay}
      current="design"
      expanded={expanded}
      setExpanded={setExpanded}
      onStep={onStep}
      header={{
        title: `${essay.company} · ${essay.role} · 자기소개서`,
        status: `Q${essay.activeQuestion + 1} · ${selected.length}개 경험`,
        onHome,
        onBack,
        actionLabel: "다음 단계",
        onAction: onNext,
        busy,
        actionDisabled: !selected.length,
      }}
    >
      <div className="essay-design-grid">
        <section className="question-board">
          <div className="board-heading">
            <div>
              <span className="eyebrow">QUESTION BOARD</span>
              <h1>문항마다 근거와 작성 조건을 설계하세요.</h1>
            </div>
            <span>{essay.questions.length} questions</span>
          </div>
          <div className="question-list">
            {essay.questions.map((question, index) => (
              <article
                className={cn(
                  "question-card",
                  essay.activeQuestion === index && "active",
                )}
                key={question.id}
              >
                <button
                  className="question-card-toggle"
                  onClick={() => onSelectQuestion(index)}
                >
                  <div className="question-number">Q{index + 1}</div>
                  <div className="question-content">
                    <h2>{question.prompt}</h2>
                    <div className="question-meta">
                      <span>{question.charLimit}자</span>
                      <span>
                        {question.selectedExperienceIds.length}개 경험
                      </span>
                      {question.needsRegeneration && (
                        <span className="changed-label">설계 변경됨</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={18} />
                </button>
                {essay.activeQuestion === index && (
                  <div
                    className="context-drop"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={onDrop}
                  >
                    <span>Q{index + 1}에 연결된 경험</span>
                    <div className="selected-contexts">
                      {selected.length ? (
                        selected.map((item) => (
                          <div className="selected-experience" key={item.id}>
                            <GripVertical size={14} />
                            <strong>{item.title}</strong>
                            <div className="chip-row">
                              {item.chips.slice(0, 2).map(([label, tone]) => (
                                <Chip tone={tone} key={`${tone}-${label}`}>
                                  {label}
                                </Chip>
                              ))}
                            </div>
                            <IconButton
                              label="이 문항에서 제거"
                              onClick={() =>
                                setContext(
                                  selectedIds.filter((id) => id !== item.id),
                                )
                              }
                            >
                              <X size={14} />
                            </IconButton>
                          </div>
                        ))
                      ) : (
                        <div className="context-empty">
                          <Plus size={17} />
                          Archive 탭에서 이 문항의 경험을 추가하세요.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
        <aside className="context-panel">
          <div className="context-tabs">
            <button
              className={tab === "archive" ? "active" : ""}
              onClick={() => setTab("archive")}
            >
              Archive
            </button>
            <button
              className={tab === "rules" ? "active" : ""}
              onClick={() => setTab("rules")}
            >
              Rules
            </button>
            <button
              className={tab === "reference" ? "active" : ""}
              onClick={() => setTab("reference")}
            >
              Reference
            </button>
          </div>
          {tab === "archive" && (
            <>
              <div className="context-panel-head">
                <div>
                  <span className="eyebrow">CONNECTED ARCHIVE</span>
                  <h2>경험 라이브러리</h2>
                </div>
                <Search size={17} />
              </div>
              <div className="library-list">
                {experiences.map((experience, index) => (
                  <article
                    className="library-card"
                    key={experience.id}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("experience", experience.id)
                    }
                  >
                    <div className="library-card-head">
                      <div>
                        <span>{Math.max(72, 96 - index * 4)}%</span>
                        <h3>{experience.title}</h3>
                      </div>
                      <GripVertical size={17} />
                    </div>
                    <p>{experience.summary}</p>
                    <div className="chip-row">
                      {experience.chips.slice(0, 3).map(([label, tone]) => (
                        <Chip tone={tone} key={`${tone}-${label}`}>
                          {label}
                        </Chip>
                      ))}
                    </div>
                    <Button
                      onClick={() => addExperience(experience)}
                      disabled={selectedIds.includes(experience.id)}
                      icon={selectedIds.includes(experience.id) ? Check : Plus}
                    >
                      {selectedIds.includes(experience.id)
                        ? "이 문항에 선택됨"
                        : `Q${essay.activeQuestion + 1}에 추가`}
                    </Button>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "rules" && (
            <RulesPanel essay={essay} onSaveEssay={onSaveEssay} />
          )}
          {tab === "reference" && (
            <ReferencePanel essay={essay} onSaveEssay={onSaveEssay} />
          )}
        </aside>
      </div>
    </WorkflowPage>
  );
}

function getSelectionDetails(editor) {
  const selection = window.getSelection();
  if (
    !selection ||
    selection.rangeCount === 0 ||
    selection.isCollapsed ||
    !editor.contains(selection.anchorNode)
  )
    return null;
  const range = selection.getRangeAt(0);
  const before = range.cloneRange();
  before.selectNodeContents(editor);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const selectedText = range.toString();
  const fullText = editor.innerText;
  const end = start + selectedText.length;
  const prior = fullText.slice(0, start);
  const next = fullText.slice(end);
  const priorMatch = prior.match(/[^.!?。！？\n]*$/);
  const nextMatch = next.match(/^[^.!?。！？\n]*[.!?。！？]?/);
  const sentenceStart = start - (priorMatch?.[0].length || 0);
  const sentenceEnd = end + (nextMatch?.[0].length || 0);
  const sentenceRaw = fullText.slice(sentenceStart, sentenceEnd);
  return {
    start,
    end,
    sentenceStart,
    sentenceEnd,
    selectedText,
    sentenceRaw,
    sentence: sentenceRaw.trim(),
  };
}

const feedbackTypes = [
  {
    id: "verbose",
    label: "장황한 표현",
    description: "핵심 행동만 남겨 간결하게",
    tone: "lemon",
  },
  {
    id: "ai",
    label: "AI 같은 표현",
    description: "상투적인 표현을 자연스럽게",
    tone: "lilac",
  },
  {
    id: "unnecessary",
    label: "불필요한 서술",
    description: "문장에서 제거해도 되는 내용",
    tone: "rose",
  },
  {
    id: "vague",
    label: "모호한 표현",
    description: "행동과 결과를 근거로 구체화",
    tone: "sky",
  },
  {
    id: "keep",
    label: "유지할 표현",
    description: "좋은 문장으로 표시하고 유지",
    tone: "mint",
  },
];

function feedbackType(id) {
  return feedbackTypes.find((item) => item.id === id) || feedbackTypes[0];
}

function questionSummary(question, index) {
  if (question.theme && question.theme !== "직접 입력")
    return question.theme.replace(" · 문제해결", "과정");
  if (question.prompt.includes("지원") || question.prompt.includes("입사"))
    return "지원동기";
  if (question.prompt.includes("협업") || question.prompt.includes("팀"))
    return "협업과정";
  if (question.prompt.includes("역량") || question.prompt.includes("직무"))
    return "직무역량";
  return `문항 ${index + 1}`;
}

function suggestSentence(sentence, category, evidence) {
  const clean = sentence.replace(/\s+/g, " ").trim();
  if (category === "unnecessary") return "";
  if (category === "keep") return clean;
  if (category === "verbose")
    return clean
      .replace(/저는 /g, "")
      .replace(/또한,?\s*/g, "")
      .replace(/이를 통해\s*/g, "")
      .replace(/할 수 있었습니다/g, "했습니다")
      .replace(/하게 되었습니다/g, "했습니다");
  if (category === "ai")
    return clean
      .replace(/단순히 ([^,.]+)에 그치지 않고,?\s*/g, "$1하고 ")
      .replace(/이를 통해/g, "그 결과")
      .replace(/기여하겠습니다/g, "실행하겠습니다")
      .replace(/깨달을 수 있었습니다/g, "배웠습니다");
  if (category === "vague" && evidence) {
    const action = evidence.star?.action || evidence.evidence;
    const result = evidence.star?.result || "그 결과를 확인했습니다.";
    return `${action} ${result}`.trim();
  }
  return clean;
}

function DraftEditor({ draft, annotations, selection, onSelect }) {
  const editorRef = useRef(null);
  const storedRanges = annotations.filter(
    (item) =>
      !item.archived &&
      item.start >= 0 &&
      item.end > item.start &&
      item.end <= draft.length &&
      draft.slice(item.start, item.end) === item.highlightText,
  );
  const ranges = [
    ...storedRanges,
    ...(selection
      ? [{ ...selection, id: "current-selection", category: "selection" }]
      : []),
  ]
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter(
      (item, index, list) => index === 0 || item.start >= list[index - 1].end,
    );
  const content = [];
  let cursor = 0;
  ranges.forEach((range) => {
    if (range.start > cursor)
      content.push(
        <span key={`text-${cursor}`}>{draft.slice(cursor, range.start)}</span>,
      );
    const type =
      range.category === "selection" ? null : feedbackType(range.category);
    content.push(
      <mark
        key={range.id}
        className={cn(
          "feedback-highlight",
          type && `tone-${type.tone}`,
          range.category === "selection" && "is-selection",
          range.status && `is-${range.status}`,
        )}
        title={type?.label}
      >
        {draft.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < draft.length)
    content.push(<span key={`text-${cursor}`}>{draft.slice(cursor)}</span>);
  return (
    <div
      ref={editorRef}
      className="rich-draft-editor selectable-draft"
      role="textbox"
      aria-label="자기소개서 초안"
      tabIndex={0}
      onMouseUp={() => onSelect(getSelectionDetails(editorRef.current))}
    >
      {content.length ? content : draft}
    </div>
  );
}

function StarEvidence({ experience }) {
  const star = experience.star || blankStar;
  return (
    <div className="star-evidence">
      <div className="star-evidence-head">
        <strong>{experience.title}</strong>
        <span>STAR</span>
      </div>
      {[
        ["S", "Situation", star.situation || experience.evidence],
        ["T", "Task", star.task],
        ["A", "Action", star.action || experience.evidence],
        ["R", "Result", star.result],
      ].map(([letter, label, value]) => (
        <div className="star-evidence-row" key={letter}>
          <b>{letter}</b>
          <div>
            <span>{label}</span>
            <p>{value || "Archive에서 근거를 추가해 주세요."}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function WritingFeedback({
  essay,
  experiences,
  apiConfig,
  onSelectQuestion,
  onSaveQuestion,
  onGenerate,
  onHome,
  onBack,
  onComplete,
  expanded,
  setExpanded,
  onStep,
  busy,
}) {
  const question = essay.questions[essay.activeQuestion] || essay.questions[0];
  const [draft, setDraft] = useState(question.draft);
  const [feedback, setFeedback] = useState(
    question.feedback || "내 말투처럼 더 담백하게, 첫 문단은 짧게",
  );
  const [annotations, setAnnotations] = useState(question.annotations || []);
  const [saveState, setSaveState] = useState("저장됨");
  const [selection, setSelection] = useState(null);
  const selected = question.selectedExperienceIds
    .map((id) => experiences.find((item) => item.id === id))
    .filter(Boolean);
  useUnsavedWarning(saveState === "변경됨" || saveState === "저장 중...");
  useEffect(() => {
    setDraft(question.draft);
    setFeedback(question.feedback || "내 말투처럼 더 담백하게, 첫 문단은 짧게");
    setAnnotations(question.annotations || []);
    setSelection(null);
    setSaveState("저장됨");
  }, [question.id, question.updatedAt]);
  const commit = async (
    silent = false,
    nextDraft = draft,
    nextAnnotations = annotations,
    nextFeedback = feedback,
  ) => {
    setSaveState("저장 중...");
    await onSaveQuestion(
      question.id,
      {
        draft: nextDraft,
        feedback: nextFeedback,
        annotations: nextAnnotations,
      },
      silent,
    );
    setSaveState("저장됨");
  };
  useEffect(() => {
    const flush = () => {
      commit(true).catch(() => setSaveState("저장 실패"));
    };
    window.addEventListener("wishport:flush", flush);
    return () => window.removeEventListener("wishport:flush", flush);
  }, [draft, feedback, annotations, question.id]);
  const addFeedback = async (category) => {
    if (!selection) return;
    const suggestion = suggestSentence(
      selection.sentence,
      category,
      selected[0],
    );
    const annotation = {
      id: globalThis.crypto?.randomUUID?.() || `feedback-${Date.now()}`,
      category,
      status: category === "keep" ? "kept" : "pending",
      start: selection.start,
      end: selection.end,
      sentenceStart: selection.sentenceStart,
      sentenceEnd: selection.sentenceEnd,
      originalText: selection.selectedText,
      originalSentence: selection.sentence,
      suggestion,
      highlightText: selection.selectedText,
      createdAt: new Date().toISOString(),
    };
    const next = [...annotations, annotation];
    setAnnotations(next);
    setSelection(null);
    await commit(true, draft, next);
  };
  const keepFeedback = async (id) => {
    const next = annotations.map((item) =>
      item.id === id ? { ...item, status: "kept" } : item,
    );
    setAnnotations(next);
    await commit(true, draft, next);
  };
  const acceptFeedback = async (id) => {
    const item = annotations.find((annotation) => annotation.id === id);
    if (!item) return;
    const raw = draft.slice(item.sentenceStart, item.sentenceEnd);
    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    const replacement = item.suggestion
      ? `${leading}${item.suggestion}${trailing}`
      : raw.includes("\n")
        ? "\n"
        : " ";
    const nextDraft =
      draft.slice(0, item.sentenceStart) +
      replacement +
      draft.slice(item.sentenceEnd);
    const delta = replacement.length - (item.sentenceEnd - item.sentenceStart);
    const highlightStart =
      item.sentenceStart + (item.suggestion ? leading.length : 0);
    const next = annotations.map((annotation) => {
      if (annotation.id === id)
        return {
          ...annotation,
          status: "accepted",
          archived: !item.suggestion,
          start: highlightStart,
          end: highlightStart + item.suggestion.length,
          highlightText: item.suggestion,
        };
      if (annotation.end <= item.sentenceStart) return annotation;
      if (annotation.start >= item.sentenceEnd)
        return {
          ...annotation,
          start: annotation.start + delta,
          end: annotation.end + delta,
          sentenceStart: annotation.sentenceStart + delta,
          sentenceEnd: annotation.sentenceEnd + delta,
        };
      return { ...annotation, archived: true };
    });
    setDraft(nextDraft);
    setAnnotations(next);
    await commit(true, nextDraft, next);
  };
  const changeQuestion = async (index) => {
    await commit(true);
    await onSelectQuestion(index);
  };
  const revise = async () => {
    await commit(true);
    await onGenerate(question.id, draft ? "revise" : "generate", feedback);
  };
  const move = async (step) => {
    await commit(true);
    onStep(step);
  };
  return (
    <WorkflowPage
      essay={essay}
      current="editor"
      expanded={expanded}
      setExpanded={setExpanded}
      onStep={move}
      header={{
        title: `${essay.company} · ${essay.role} · 자기소개서`,
        status: saveState,
        onHome,
        onBack: async () => {
          await commit(true);
          onBack();
        },
        actionLabel: "작성 완료",
        onAction: async () => {
          await commit(true);
          onComplete();
        },
        finalAction: true,
        cloudAction: true,
        busy,
      }}
    >
      <div className="question-tabs">
        {essay.questions.map((item, index) => (
          <button
            key={item.id}
            className={essay.activeQuestion === index ? "active" : ""}
            onClick={() => changeQuestion(index)}
          >
            <span>Q{index + 1}</span>
            <b>{questionSummary(item, index)}</b>
            <strong>
              {item.draft ? `${item.draft.length}자` : "초안 없음"}
            </strong>
            {item.needsRegeneration && <i />}
          </button>
        ))}
      </div>
      <div className="writing-layout">
        <section className="answer-editor">
          <div className="answer-head">
            <div>
              <span className="eyebrow">
                QUESTION {String(essay.activeQuestion + 1).padStart(2, "0")}
              </span>
              <h1>{question.prompt}</h1>
              <p>
                {question.charLimit}자 · 현재 {draft.length}자
              </p>
            </div>
            <div className="version-chip">
              {question.needsRegeneration ? "설계 변경됨" : "DB 저장"}
            </div>
          </div>
          {question.needsRegeneration && (
            <div className="change-notice">
              <AlertCircle size={16} />
              <span>
                경험 연결이나 문항이 바뀌었습니다. 기존 초안은 유지되며 다시
                다듬을 때 새 설계가 반영됩니다.
              </span>
            </div>
          )}
          {draft ? (
            <>
              <div className="selection-guide">
                <Highlighter size={15} />
                <span>
                  수정할 부분을 드래그한 뒤 피드백 유형을 선택하세요. 문장
                  전체를 비교하고 반영 여부를 결정할 수 있습니다.
                </span>
              </div>
              <DraftEditor
                draft={draft}
                annotations={annotations}
                selection={selection}
                onSelect={setSelection}
              />
              {selection && (
                <div className="feedback-picker">
                  <div className="feedback-picker-head">
                    <div>
                      <span className="eyebrow">SELECTED TEXT</span>
                      <strong>{selection.selectedText}</strong>
                    </div>
                    <IconButton
                      label="선택 취소"
                      onClick={() => setSelection(null)}
                    >
                      <X size={16} />
                    </IconButton>
                  </div>
                  <div className="feedback-type-grid">
                    {feedbackTypes.map((type) => (
                      <button
                        className={`tone-${type.tone}`}
                        key={type.id}
                        onClick={() => addFeedback(type.id)}
                      >
                        <span>{type.label}</span>
                        <small>{type.description}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!!annotations.length && (
                <div className="feedback-review-list">
                  <div className="review-heading">
                    <span className="eyebrow">SENTENCE REVIEW</span>
                    <h2>문장별 수정 제안</h2>
                  </div>
                  {annotations
                    .slice()
                    .reverse()
                    .map((item) => {
                      const type = feedbackType(item.category);
                      return (
                        <article
                          className={cn(
                            "feedback-review-card",
                            `tone-${type.tone}`,
                            `status-${item.status}`,
                          )}
                          key={item.id}
                        >
                          <div className="review-card-head">
                            <span>{type.label}</span>
                            <b>
                              {item.status === "accepted"
                                ? "제안 반영"
                                : item.status === "kept"
                                  ? "원문 유지"
                                  : "검토 대기"}
                            </b>
                          </div>
                          <div className="sentence-compare">
                            <div>
                              <small>기존 문장</small>
                              <p>{item.originalSentence}</p>
                            </div>
                            <ArrowRight size={17} />
                            <div>
                              <small>수정 제안</small>
                              <p>{item.suggestion || "이 문장 삭제"}</p>
                            </div>
                          </div>
                          {item.status === "pending" && (
                            <div className="review-actions">
                              <Button onClick={() => keepFeedback(item.id)}>
                                원문 유지
                              </Button>
                              <Button
                                variant="primary"
                                icon={Check}
                                onClick={() => acceptFeedback(item.id)}
                              >
                                제안으로 교체
                              </Button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                </div>
              )}
            </>
          ) : (
            <div className="draft-empty">
              <Sparkles size={25} />
              <h2>아직 이 문항의 초안이 없습니다.</h2>
              <p>
                연결된 {selected.length}개 경험을 근거로 소제목과 STAR 서술형
                초안을 만드세요.
              </p>
              <Button
                variant="primary"
                icon={busy ? LoaderCircle : Sparkles}
                className={busy ? "is-loading" : ""}
                onClick={revise}
                disabled={busy || !selected.length}
              >
                이 문항 초안 생성
              </Button>
            </div>
          )}
          <div className="protected-note">
            <Check size={15} />
            <span>
              문장 피드백, 처리 상태와 문항별 초안은 서로 독립적으로 DB에
              저장됩니다.
            </span>
          </div>
        </section>
        <aside className="feedback-panel">
          <div className="panel-section">
            <span className="eyebrow">STAR GROUNDING</span>
            <h2>Q{essay.activeQuestion + 1}에 사용한 근거</h2>
            <div className="grounding-list">
              {selected.length ? (
                selected.map((item) => (
                  <StarEvidence key={item.id} experience={item} />
                ))
              ) : (
                <p className="muted-copy">
                  문항 설계에서 경험을 연결해 주세요.
                </p>
              )}
            </div>
          </div>
          <div className="panel-section">
            <span className="eyebrow">REVISION NOTE</span>
            <h2>AI 수정 지침</h2>
            <textarea
              value={feedback}
              onChange={(event) => {
                setFeedback(event.target.value);
                setSaveState("변경됨");
              }}
              onBlur={() => commit(true)}
            />
            <div className="feedback-toolbar">
              {[
                ["담백하게", "내 말투처럼 더 담백하게 바꿔줘"],
                ["구체적으로", "추상적인 표현을 줄이고 행동을 구체화해줘"],
                ["간결하게", "문장을 더 짧고 간결하게 줄여줘"],
              ].map(([label, note]) => (
                <button
                  key={label}
                  className={feedback === note ? "active" : ""}
                  onClick={() => {
                    setFeedback(note);
                    commit(true, draft, annotations, note);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="primary"
              icon={busy ? LoaderCircle : RefreshCw}
              className={busy ? "is-loading" : ""}
              onClick={revise}
              disabled={busy || !selected.length}
            >
              {draft ? "이 문항 다시 다듬기" : "이 문항 초안 생성"}
            </Button>
            <small>
              {apiConfig.llmEnabled
                ? `${apiConfig.llmProvider === "openai" ? "OpenAI" : "Gemini"} · ${apiConfig.model} 연결됨`
                : "데모 AI 응답 사용 중"}
            </small>
          </div>
        </aside>
      </div>
    </WorkflowPage>
  );
}

const blankApplicationForm = {
  company: "",
  role: "",
  jobTitle: "",
  status: "지원 예정",
  submittedAt: "",
};

// Right Side Panel form for 지원 추가 (add application) — no gray dim overlay.
// Supports both creation paths from the brief: A) pick an existing Essay and
// auto-fill company/role/essayId, or B) enter everything manually (Essay optional).
function ApplicationPanel({ open, onClose, onSave, busy, essays }) {
  const [mode, setMode] = useState("manual");
  const [essayId, setEssayId] = useState("");
  const [form, setForm] = useState(blankApplicationForm);
  useEffect(() => {
    if (!open) return;
    setMode("manual");
    setEssayId(essays[0]?.id || "");
    setForm(blankApplicationForm);
  }, [open]);
  useEffect(() => {
    if (mode !== "essay") return;
    const essay = essays.find((item) => item.id === essayId);
    if (essay) {
      setForm((current) => ({ ...current, company: essay.company, role: essay.role }));
    }
  }, [mode, essayId]);
  const submit = () => {
    onSave({
      company: form.company,
      role: form.role,
      jobTitle: form.jobTitle,
      status: form.status,
      submittedAt: form.submittedAt,
      essayId: mode === "essay" ? essayId : "",
    });
  };
  return (
    <SidePanel
      open={open}
      onClose={onClose}
      eyebrow="APPLICATION"
      title="지원 추가"
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            icon={busy ? LoaderCircle : Cloud}
            className={cn("cloud-primary", busy && "is-loading")}
            disabled={busy || !form.company.trim()}
            onClick={submit}
          >
            추가
          </Button>
        </>
      }
    >
      <div className="mode-tabs">
        <button
          type="button"
          className={mode === "essay" ? "active" : ""}
          onClick={() => setMode("essay")}
          disabled={!essays.length}
        >
          기존 Essay 기반
        </button>
        <button
          type="button"
          className={mode === "manual" ? "active" : ""}
          onClick={() => setMode("manual")}
        >
          직접 추가
        </button>
      </div>
      {mode === "essay" && (
        <label className="field-group">
          <span>Essay 선택</span>
          <select value={essayId} onChange={(event) => setEssayId(event.target.value)}>
            {essays.map((essay) => (
              <option key={essay.id} value={essay.id}>
                {essay.company} · {essay.role}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="form-grid">
        <Field
          label="기업명"
          value={form.company}
          required
          onChange={(value) => setForm((current) => ({ ...current, company: value }))}
        />
        <Field
          label="직무"
          value={form.role}
          onChange={(value) => setForm((current) => ({ ...current, role: value }))}
        />
        <Field
          label="공고명"
          value={form.jobTitle}
          onChange={(value) => setForm((current) => ({ ...current, jobTitle: value }))}
        />
        <label className="field-group">
          <span>상태</span>
          <select
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({ ...current, status: event.target.value }))
            }
          >
            {statusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <Field
          label="지원일"
          type="date"
          value={form.submittedAt}
          onChange={(value) => setForm((current) => ({ ...current, submittedAt: value }))}
        />
      </div>
    </SidePanel>
  );
}

const readinessLabel = {
  ready: "Ready",
  need_refinement: "Need refinement",
  missing: "Missing",
};

function CabinetCustomAnswerEditor({ entry, busy, onSave, onCancel }) {
  const [answerText, setAnswerText] = useState(entry.answerText || "");
  return (
    <div className="cabinet-add-form">
      <label className="field-group">
        <span>답변</span>
        <textarea
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
          placeholder="답변을 정리해 보세요."
          autoFocus
        />
      </label>
      <div className="cabinet-add-actions">
        <Button onClick={onCancel}>취소</Button>
        <Button
          variant="primary"
          className="cloud-primary"
          icon={busy ? LoaderCircle : Cloud}
          disabled={busy}
          onClick={() => onSave({ answerText })}
        >
          저장
        </Button>
      </div>
    </div>
  );
}

function SetQuestionCard({
  question,
  index,
  onSave,
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast,
  reordering,
}) {
  const [answerText, setAnswerText] = useState(question.answerText || "");
  const [followupText, setFollowupText] = useState(question.followupText || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setAnswerText(question.answerText || "");
    setFollowupText(question.followupText || "");
  }, [question.id, question.answerText, question.followupText]);
  const dirty =
    answerText !== (question.answerText || "") ||
    followupText !== (question.followupText || "");
  const save = async () => {
    setBusy(true);
    try {
      await onSave({ answerText, followupText });
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className={cn("set-question-card", question.status)}>
      <div className="set-question-head">
        <span className="source-chip soft">{question.sourceType}</span>
        <div className="set-question-head-right">
          <b className={`readiness-dot ${question.status}`} />
          <small>{readinessLabel[question.status]}</small>
          <div className="set-question-reorder">
            <IconButton
              label="위로 이동"
              disabled={isFirst || reordering}
              onClick={onMoveUp}
            >
              <ChevronUp size={14} />
            </IconButton>
            <IconButton
              label="아래로 이동"
              disabled={isLast || reordering}
              onClick={onMoveDown}
            >
              <ChevronDown size={14} />
            </IconButton>
          </div>
          <IconButton label="질문 삭제" className="danger-action" onClick={onDelete}>
            <Trash2 size={13} />
          </IconButton>
        </div>
      </div>
      <h3>
        Q{index + 1}. {question.questionText}
      </h3>
      <label className="field-group">
        <span>Answer</span>
        <textarea
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
          placeholder="답변을 정리해 보세요."
        />
      </label>
      <label className="field-group">
        <span>Follow-up</span>
        <textarea
          value={followupText}
          onChange={(event) => setFollowupText(event.target.value)}
          placeholder="예상 꼬리 질문이나 보완할 점을 적어두세요."
        />
      </label>
      <div className="set-question-actions">
        <Button
          variant="primary"
          className="cloud-primary"
          icon={busy ? LoaderCircle : Cloud}
          disabled={busy || !dirty}
          onClick={save}
        >
          저장
        </Button>
      </div>
    </article>
  );
}

const blankSetCreateForm = {
  name: "",
  company: "",
  role: "",
  questionCategory: "",
  jdProvided: false,
  jdText: "",
};

function Interview({ data, apiConfig, onReload, notify, focusSet }) {
  const interview = data.interview || blankData.interview;
  const sets = interview.sets || [];
  const [view, setView] = useState("room");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reorderingSetId, setReorderingSetId] = useState("");
  const [createMode, setCreateMode] = useState("essay");
  const [createEssayId, setCreateEssayId] = useState(data.essays[0]?.id || "");
  const [createForm, setCreateForm] = useState(blankSetCreateForm);
  const [homeInput, setHomeInput] = useState("");
  const [selectedClusterId, setSelectedClusterId] = useState(
    interview.clusters[0]?.id || "self_intro",
  );
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [coachingByMessageId, setCoachingByMessageId] = useState({});
  const [selectedCoachingId, setSelectedCoachingId] = useState("");
  const [coachingLoading, setCoachingLoading] = useState(false);
  const chatThreadRef = useRef(null);
  useEffect(() => {
    chatThreadRef.current?.scrollTo({ top: chatThreadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, coachingLoading]);
  const assetsByCluster = useMemo(
    () =>
      new Map(
        interview.answerAssets.map((asset) => [asset.questionClusterId, asset]),
      ),
    [interview.answerAssets],
  );
  const selectedCluster =
    interview.clusters.find((item) => item.id === selectedClusterId) ||
    interview.clusters[0];
  const todayCluster =
    interview.clusters.find((cluster) => !assetsByCluster.get(cluster.id)) ||
    interview.clusters.find(
      (cluster) => assetsByCluster.get(cluster.id)?.readiness !== "ready",
    ) ||
    interview.clusters[0];
  const representativeExperience =
    data.experiences.find(
      (item) =>
        item.id ===
        (assetsByCluster.get(selectedCluster?.id)?.representativeExperienceId || ""),
    ) || data.experiences[0];
  const selectedSet = sets.find((item) => item.id === selectedSetId);

  // Cabinet: every question ever answered — from the quick "오늘의 질문" practice
  // (interview.answerAssets, keyed by cluster), from every Interview Set's
  // questions, and from questions the user adds directly — organized by
  // cluster category for browsing. Set/custom questions both come from the
  // same flat interview.questions list (each row appears exactly once there),
  // told apart by whether they belong to a Set (sessionId set) or not.
  const setsBySessionId = useMemo(() => new Map(sets.map((set) => [set.id, set])), [sets]);
  const cabinetEntries = useMemo(() => {
    const entries = [];
    interview.clusters.forEach((cluster) => {
      const asset = assetsByCluster.get(cluster.id);
      if (asset && (asset.fullAnswer || asset.coreMessage)) {
        entries.push({
          id: `practice-${cluster.id}`,
          group: cluster.group,
          clusterId: cluster.id,
          clusterLabel: cluster.label,
          questionText: cluster.label,
          answerText: asset.fullAnswer || asset.coreMessage,
          status: asset.readiness,
          sourceLabel: "오늘의 질문 연습",
          sourceType: "practice",
        });
      }
    });
    interview.questions.forEach((question) => {
      const cluster =
        interview.clusters.find((item) => item.id === question.questionClusterId) ||
        interview.clusters[0];
      const set = question.sessionId ? setsBySessionId.get(question.sessionId) : null;
      entries.push({
        id: question.id,
        group: cluster?.group || "Core",
        clusterId: cluster?.id || "",
        clusterLabel: cluster?.label || "",
        questionText: question.questionText,
        answerText: question.answerText,
        status: question.status,
        sourceLabel: set ? set.name || "Interview Set" : "직접 추가",
        sourceType: set ? "set" : "custom",
        setId: set?.id || "",
      });
    });
    return entries;
  }, [interview.clusters, interview.questions, assetsByCluster, setsBySessionId]);
  const cabinetGroupOrder = ["Core", "Behavioral", "Experience", "Job Knowledge"];
  const cabinetGroups = cabinetGroupOrder
    .map((group) => {
      const clusters = interview.clusters.filter((cluster) => cluster.group === group);
      const answeredClusterIds = new Set(
        cabinetEntries
          .filter((entry) => entry.group === group)
          .map((entry) => entry.clusterId),
      );
      return { group, clusters, answeredClusterCount: answeredClusterIds.size };
    })
    .filter((item) => item.clusters.length);
  const [cabinetGroupId, setCabinetGroupId] = useState("");
  const [cabinetClusterId, setCabinetClusterId] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [customEditId, setCustomEditId] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const activeCabinetGroup =
    cabinetGroups.find((item) => item.group === cabinetGroupId) || cabinetGroups[0];
  const activeCabinetCluster =
    activeCabinetGroup?.clusters.find((item) => item.id === cabinetClusterId) ||
    activeCabinetGroup?.clusters[0];
  const activeCabinetEntries = cabinetEntries.filter(
    (entry) => entry.clusterId === activeCabinetCluster?.id,
  );
  const openCabinet = () => {
    setCabinetGroupId(cabinetGroups[0]?.group || "");
    setCabinetClusterId(cabinetGroups[0]?.clusters[0]?.id || "");
    setAddingQuestion(false);
    setView("cabinet");
  };
  const addCustomQuestion = async () => {
    if (!activeCabinetCluster || !newQuestionText.trim()) return;
    setBusy(true);
    try {
      await api("/api/interview/questions", {
        method: "POST",
        body: JSON.stringify({
          questionClusterId: activeCabinetCluster.id,
          questionText: newQuestionText,
          answerText: newAnswerText,
        }),
      });
      await onReload();
      setAddingQuestion(false);
      setNewQuestionText("");
      setNewAnswerText("");
      notify("Cabinet에 질문을 추가했습니다.");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  };
  const deleteCustomQuestion = async (entry) => {
    if (!window.confirm("이 질문을 삭제할까요?")) return;
    try {
      await api(`/api/interview/questions/${entry.id}`, { method: "DELETE" });
      await onReload();
      notify("질문을 삭제했습니다.");
    } catch (error) {
      notify(error.message);
    }
  };

  useEffect(() => {
    if (!focusSet) return;
    if (focusSet.id) {
      setSelectedSetId(focusSet.id);
      setView("set-detail");
      setCreating(false);
    } else {
      setView("room");
      setCreateMode(data.essays.length ? "essay" : "manual");
      setCreateEssayId(data.essays[0]?.id || "");
      setCreateForm(blankSetCreateForm);
      setCreating(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSet?.token]);

  const openingLine = (cluster) => `${cluster?.label || "자기소개"}에 대해 말씀해 주시겠어요?`;
  const openChat = (clusterId, prefill = "") => {
    const cluster =
      interview.clusters.find((item) => item.id === clusterId) ||
      selectedCluster ||
      todayCluster;
    if (clusterId) setSelectedClusterId(clusterId);
    const opening = { id: `m-${Date.now()}-i`, role: "interviewer", text: openingLine(cluster) };
    const initial = prefill.trim()
      ? [opening, { id: `m-${Date.now()}-me`, role: "me", text: prefill.trim() }]
      : [opening];
    setMessages(initial);
    setChatInput("");
    setCoachingByMessageId({});
    setSelectedCoachingId("");
    setCreating(false);
    setView("chat");
    if (prefill.trim()) requestCoaching(initial[initial.length - 1], initial);
  };
  const startToday = () => openChat(todayCluster?.id, "");
  const requestCoaching = async (message, history) => {
    setCoachingLoading(true);
    setSelectedCoachingId(message.id);
    try {
      const questionText =
        [...history].reverse().find((item) => item.role === "interviewer" && item !== message)
          ?.text || "";
      const body = await api("/api/llm/interview-coaching", {
        method: "POST",
        body: JSON.stringify({
          questionText,
          answerText: message.text,
          history: history.map((item) => ({ role: item.role, text: item.text })),
          experiences: data.experiences,
        }),
      });
      setCoachingByMessageId((current) => ({ ...current, [message.id]: body.coaching }));
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, followups: body.coaching.followups || [] } : item,
        ),
      );
    } catch (error) {
      notify(error.message);
    } finally {
      setCoachingLoading(false);
    }
  };
  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const message = { id: `m-${Date.now()}-me`, role: "me", text: chatInput.trim() };
    const next = [...messages, message];
    setMessages(next);
    setChatInput("");
    requestCoaching(message, next);
  };
  const askFollowup = (text) => {
    setMessages((current) => [...current, { id: `m-${Date.now()}-i`, role: "interviewer", text }]);
  };
  const selectedCoaching = coachingByMessageId[selectedCoachingId];
  const selectedCoachingMessage = messages.find((item) => item.id === selectedCoachingId);
  const toggleCreate = () => {
    setCreating((current) => {
      const next = !current;
      if (next) {
        setCreateMode(data.essays.length ? "essay" : "manual");
        setCreateEssayId(data.essays[0]?.id || "");
        setCreateForm(blankSetCreateForm);
      }
      return next;
    });
  };
  const submitHomeInput = () => {
    if (!homeInput.trim()) return;
    openChat(todayCluster?.id, homeInput.trim());
    setHomeInput("");
  };
  const createSet = async () => {
    setBusy(true);
    try {
      const essay =
        createMode === "essay"
          ? data.essays.find((item) => item.id === createEssayId)
          : null;
      const pseudoApplication = {
        company: createMode === "essay" ? essay?.company : createForm.company,
        role: createMode === "essay" ? essay?.role : createForm.role,
      };
      const generated = await api("/api/llm/interview-questions", {
        method: "POST",
        body: JSON.stringify({
          application: pseudoApplication,
          essay: essay || {},
          experiences: data.experiences,
        }),
      });
      const body = await api("/api/interview/sets", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name,
          essayId: createMode === "essay" ? createEssayId : "",
          essay: essay || undefined,
          company: createMode === "manual" ? createForm.company : undefined,
          role: createMode === "manual" ? createForm.role : undefined,
          questionCategory: createForm.questionCategory,
          jdProvided: createForm.jdProvided,
          jdText: createForm.jdText,
          experiences: data.experiences,
          questions: generated.questions || [],
        }),
      });
      await onReload();
      setSelectedSetId(body.set.id);
      setCreating(false);
      setView("set-detail");
      notify(
        generated.provider === "gemini"
          ? "Gemini로 Interview Set을 생성했습니다."
          : generated.provider === "openai"
            ? "OpenAI로 Interview Set을 생성했습니다."
            : "데모 질문으로 Interview Set을 생성했습니다.",
      );
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  };
  const deleteSet = async (set) => {
    if (!window.confirm(`'${set.name}' Interview Set을 삭제할까요?`)) return;
    try {
      await api(`/api/interview/sets/${set.id}`, { method: "DELETE" });
      await onReload();
      setView("room");
      notify("Interview Set을 삭제했습니다.");
    } catch (error) {
      notify(error.message);
    }
  };
  const saveQuestionAnswer = async (question, patch) => {
    await api(`/api/interview/questions/${question.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    await onReload();
    notify("답변을 저장했습니다.");
  };
  const moveSetQuestion = async (set, index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= set.questions.length) return;
    const order = set.questions.map((question) => question.id);
    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    setReorderingSetId(set.id);
    try {
      await api(`/api/interview/sets/${set.id}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ questionIds: order }),
      });
      await onReload();
    } catch (error) {
      notify(error.message);
    } finally {
      setReorderingSetId("");
    }
  };
  const deleteSetQuestion = async (question) => {
    if (!window.confirm("이 질문을 Interview Set에서 삭제할까요?")) return;
    try {
      await api(`/api/interview/questions/${question.id}`, { method: "DELETE" });
      await onReload();
      notify("질문을 삭제했습니다.");
    } catch (error) {
      notify(error.message);
    }
  };
  const saveCoachedAnswer = async () => {
    if (!selectedCoachingMessage) return;
    const cluster = selectedCluster || todayCluster;
    const experience = representativeExperience;
    const coaching = selectedCoaching;
    setBusy(true);
    try {
      await api("/api/interview/answer-assets", {
        method: "POST",
        body: JSON.stringify({
          questionClusterId: cluster.id,
          clusterLabel: cluster.label,
          representativeExperienceId: experience?.id || "",
          coreMessage: selectedCoachingMessage.text.slice(0, 90),
          talkingPoints: {},
          fullAnswer: selectedCoachingMessage.text,
          followupQuestions: coaching?.followups || [],
          archiveGrounding: {
            experience: experience?.title || "",
            materials: experience?.chips
              ?.filter(([, tone]) => tone === "material")
              .map(([label]) => label),
            results: experience?.chips
              ?.filter(([, tone]) => tone === "result")
              .map(([label]) => label),
            skills: experience?.chips
              ?.filter(([, tone]) => tone === "skill")
              .map(([label]) => label),
          },
          weakSpots: coaching?.improvements || [],
        }),
      });
      await onReload();
      notify("연습 답변을 저장했습니다.");
      setView("room");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="content-page interview-page">
      {view === "room" && (
        <>
          <PageHeading
            eyebrow="SPOKEN PREPARATION LAYER"
            title="Interview Room"
            description="오늘의 질문에 답하며 연습하거나, Interview Set을 만들고, Cabinet에서 모든 질문을 카테고리별로 찾아봅니다."
            actions={
              <Button variant="primary" className="cloud-primary" icon={LayoutDashboard} onClick={openCabinet}>
                Cabinet
              </Button>
            }
          />
          <div className="interview-today-hero">
            <span className="eyebrow">TODAY'S QUESTION</span>
            <h1>
              <span className="highlight-mark">{todayCluster?.label || "핵심 질문"}</span>
            </h1>
            <p>
              {data.experiences[0]?.title
                ? `추천 경험 · ${data.experiences[0].title}을 바탕으로 답을 정리해보세요.`
                : "Archive에 경험을 등록하면 더 정확한 질문을 추천해드립니다."}
            </p>
            <form
              className="claude-input"
              onSubmit={(event) => {
                event.preventDefault();
                submitHomeInput();
              }}
            >
              <textarea
                value={homeInput}
                onChange={(event) => setHomeInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitHomeInput();
                  }
                }}
                placeholder="이 질문에 대한 답을 자유롭게 적어보세요..."
                rows={1}
              />
              <button
                type="submit"
                className="claude-input-send"
                disabled={!homeInput.trim()}
                aria-label="답변 시작하기"
              >
                <ArrowUp size={18} />
              </button>
            </form>
          </div>
          <div className="section-divider" />
          <section className="cabinet-section">
            <div className="cabinet-section-actions">
              <Button
                variant="primary"
                className="cloud-primary"
                icon={Plus}
                onClick={toggleCreate}
              >
                Interview Set
              </Button>
            </div>
            <SidePanel
              open={creating}
              onClose={() => setCreating(false)}
              eyebrow="CABINET"
              title="새 Interview Set"
              footer={
                <Button
                  variant="primary"
                  className="cloud-primary"
                  icon={busy ? LoaderCircle : Sparkles}
                  disabled={busy || (createMode === "essay" && !createEssayId)}
                  onClick={createSet}
                >
                  Interview Set 생성
                </Button>
              }
            >
              <div className="mode-tabs">
                <button
                  type="button"
                  className={createMode === "essay" ? "active" : ""}
                  onClick={() => setCreateMode("essay")}
                  disabled={!data.essays.length}
                >
                  Essay 기반
                </button>
                <button
                  type="button"
                  className={createMode === "manual" ? "active" : ""}
                  onClick={() => setCreateMode("manual")}
                >
                  직접 생성
                </button>
              </div>
              {createMode === "essay" ? (
                <label className="field-group">
                  <span>Essay 선택</span>
                  <select value={createEssayId} onChange={(event) => setCreateEssayId(event.target.value)}>
                    {data.essays.map((essay) => (
                      <option key={essay.id} value={essay.id}>
                        {essay.company} · {essay.role}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="form-grid">
                  <Field
                    label="지원 회사"
                    value={createForm.company}
                    onChange={(value) => setCreateForm((current) => ({ ...current, company: value }))}
                  />
                  <Field
                    label="지원 직무"
                    value={createForm.role}
                    onChange={(value) => setCreateForm((current) => ({ ...current, role: value }))}
                  />
                  <Field
                    label="질문 유형"
                    value={createForm.questionCategory}
                    placeholder="예: 인성, 기술, PT 면접"
                    onChange={(value) =>
                      setCreateForm((current) => ({ ...current, questionCategory: value }))
                    }
                  />
                </div>
              )}
              <Field
                label="Set Name"
                value={createForm.name}
                placeholder="예: 한국전력거래소 Interview Set"
                onChange={(value) => setCreateForm((current) => ({ ...current, name: value }))}
              />
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={createForm.jdProvided}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, jdProvided: event.target.checked }))
                  }
                />
                <span>JD를 입력합니다</span>
              </label>
              {createForm.jdProvided && (
                <label className="field-group">
                  <span>JD 내용</span>
                  <textarea
                    value={createForm.jdText}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, jdText: event.target.value }))
                    }
                    placeholder="채용 공고 JD를 붙여넣어 주세요."
                  />
                </label>
              )}
            </SidePanel>
            <div className="cabinet-grid">
              {sets.map((set) => {
                const needCount = set.questions.filter(
                  (question) => question.status === "need_refinement",
                ).length;
                return (
                  <article
                    className="cabinet-card"
                    key={set.id}
                    onClick={() => {
                      setSelectedSetId(set.id);
                      setCreating(false);
                      setView("set-detail");
                    }}
                  >
                    <span className="eyebrow">
                      {set.company || "공통"}
                      {set.role ? ` · ${set.role}` : ""}
                    </span>
                    <h3>{set.name || "이름 없는 Set"}</h3>
                    <Chip tone={set.sourceType === "essay" ? "material" : "skill"}>
                      {set.sourceType === "essay" ? "Essay 기반" : "직접 생성"}
                    </Chip>
                    <div className="cabinet-card-stats">
                      <div>
                        <span>Questions</span>
                        <b>{set.questions.length}</b>
                      </div>
                      <div>
                        <span>Ready</span>
                        <b>{set.readyCount}</b>
                      </div>
                      <div>
                        <span>Weak Spot</span>
                        <b>{needCount}</b>
                      </div>
                    </div>
                    <small>최근 수정 {relativeTime(set.updatedAt)}</small>
                  </article>
                );
              })}
              {!sets.length && !creating && (
                <EmptyState title="아직 만든 Interview Set이 없습니다. + Interview Set으로 시작해 보세요." />
              )}
            </div>
          </section>
        </>
      )}
      {view === "cabinet" && (
        <>
          <PageHeading
            eyebrow="QUESTION LIBRARY"
            title="Cabinet"
            description="오늘의 질문 연습과 모든 Interview Set에서 사용한 질문을 카테고리별로 모아둡니다."
            actions={
              <Button icon={ArrowLeft} onClick={() => setView("room")}>
                Interview Room으로
              </Button>
            }
          />
          <div className="cabinet-split">
            <aside className="cabinet-pane cabinet-pane-groups">
              {cabinetGroups.map((item) => (
                <button
                  key={item.group}
                  className={activeCabinetGroup?.group === item.group ? "active" : ""}
                  onClick={() => {
                    setCabinetGroupId(item.group);
                    setCabinetClusterId(item.clusters[0]?.id || "");
                    setAddingQuestion(false);
                  }}
                >
                  <span>{item.group}</span>
                  <small>
                    {item.answeredClusterCount}/{item.clusters.length}
                  </small>
                </button>
              ))}
            </aside>
            <aside className="cabinet-pane cabinet-pane-clusters">
              {activeCabinetGroup?.clusters.map((cluster) => {
                const count = cabinetEntries.filter(
                  (entry) => entry.clusterId === cluster.id,
                ).length;
                return (
                  <button
                    key={cluster.id}
                    className={activeCabinetCluster?.id === cluster.id ? "active" : ""}
                    onClick={() => {
                      setCabinetClusterId(cluster.id);
                      setAddingQuestion(false);
                    }}
                  >
                    <b className={`readiness-dot ${count ? "ready" : "missing"}`} />
                    <span>{cluster.label}</span>
                    <small>{count}</small>
                  </button>
                );
              })}
            </aside>
            <section className="cabinet-pane cabinet-pane-entries">
              <div className="cabinet-entries-head">
                <h3>{activeCabinetCluster?.label || "카테고리를 선택하세요"}</h3>
                {activeCabinetCluster && (
                  <Button
                    icon={addingQuestion ? X : Plus}
                    onClick={() => {
                      setAddingQuestion((current) => !current);
                      setNewQuestionText("");
                      setNewAnswerText("");
                    }}
                  >
                    {addingQuestion ? "닫기" : "질문 추가"}
                  </Button>
                )}
              </div>
              {addingQuestion && (
                <div className="cabinet-add-form">
                  <label className="field-group">
                    <span>질문</span>
                    <textarea
                      value={newQuestionText}
                      onChange={(event) => setNewQuestionText(event.target.value)}
                      placeholder="직접 준비하고 싶은 질문을 적어주세요."
                    />
                  </label>
                  <label className="field-group">
                    <span>답변</span>
                    <textarea
                      value={newAnswerText}
                      onChange={(event) => setNewAnswerText(event.target.value)}
                      placeholder="답변을 정리해 보세요. (나중에 작성해도 됩니다)"
                    />
                  </label>
                  <div className="cabinet-add-actions">
                    <Button
                      variant="primary"
                      className="cloud-primary"
                      icon={busy ? LoaderCircle : Plus}
                      disabled={busy || !newQuestionText.trim()}
                      onClick={addCustomQuestion}
                    >
                      추가
                    </Button>
                  </div>
                </div>
              )}
              {activeCabinetEntries.map((entry) => (
                <article className="cabinet-entry-card" key={entry.id}>
                  <div className="cabinet-entry-head">
                    <span className="source-chip soft">{entry.sourceLabel}</span>
                    <div className="cabinet-entry-head-right">
                      <b className={`readiness-dot ${entry.status}`} />
                      {entry.sourceType === "set" && (
                        <IconButton
                          label="Set에서 열기"
                          className="cabinet-entry-open"
                          onClick={() => {
                            setSelectedSetId(entry.setId);
                            setView("set-detail");
                          }}
                        >
                          <ArrowRight size={13} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                  <h4>{entry.questionText}</h4>
                  <p className={cn("essay-view-answer", !entry.answerText && "is-empty")}>
                    {entry.answerText || "아직 저장된 답변이 없습니다."}
                  </p>
                  {entry.sourceType === "practice" && (
                    <Button onClick={() => openChat(entry.clusterId, "")}>
                      Guided Chat에서 이어쓰기
                    </Button>
                  )}
                  {entry.sourceType === "custom" && (
                    <div className="cabinet-entry-actions">
                      <Button onClick={() => setCustomEditId(entry.id)}>답변 수정</Button>
                      <IconButton
                        label="질문 삭제"
                        className="danger-action"
                        onClick={() => deleteCustomQuestion(entry)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  )}
                  {customEditId === entry.id && (
                    <CabinetCustomAnswerEditor
                      entry={entry}
                      busy={busy}
                      onCancel={() => setCustomEditId("")}
                      onSave={async (patch) => {
                        setBusy(true);
                        try {
                          await api(`/api/interview/questions/${entry.id}`, {
                            method: "PATCH",
                            body: JSON.stringify(patch),
                          });
                          await onReload();
                          setCustomEditId("");
                          notify("답변을 저장했습니다.");
                        } catch (error) {
                          notify(error.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                  )}
                </article>
              ))}
              {!activeCabinetEntries.length && !addingQuestion && (
                <EmptyState title="이 카테고리에는 아직 작성된 답변이 없습니다." />
              )}
            </section>
          </div>
        </>
      )}
      {view === "set-detail" && selectedSet && (
        <>
          <PageHeading
            eyebrow="INTERVIEW SET"
            title={selectedSet.name || "이름 없는 Set"}
            description={
              selectedSet.sourceType === "essay"
                ? "Essay · Archive · JD 기반으로 생성된 질문 세트입니다."
                : "직접 입력한 정보로 생성된 질문 세트입니다."
            }
            actions={
              <>
                <Button icon={ArrowLeft} onClick={() => setView("room")}>
                  Interview Room으로
                </Button>
                <IconButton
                  label="Interview Set 삭제"
                  className="danger-action"
                  onClick={() => deleteSet(selectedSet)}
                >
                  <Trash2 size={15} />
                </IconButton>
              </>
            }
          />
          <div className="side-panel-meta set-detail-meta">
            <div>
              <span>Source</span>
              <b>{selectedSet.sourceType === "essay" ? "Essay 기반" : "직접 생성"}</b>
            </div>
            <div>
              <span>Readiness</span>
              <b>{selectedSet.readiness}%</b>
            </div>
          </div>
          <div className="set-question-list">
            {selectedSet.questions.map((question, index) => (
              <SetQuestionCard
                key={question.id}
                index={index}
                question={question}
                onSave={(patch) => saveQuestionAnswer(question, patch)}
                onMoveUp={() => moveSetQuestion(selectedSet, index, -1)}
                onMoveDown={() => moveSetQuestion(selectedSet, index, 1)}
                onDelete={() => deleteSetQuestion(question)}
                isFirst={index === 0}
                isLast={index === selectedSet.questions.length - 1}
                reordering={reorderingSetId === selectedSet.id}
              />
            ))}
            {!selectedSet.questions.length && (
              <EmptyState title="생성된 질문이 없습니다." />
            )}
          </div>
        </>
      )}
      {view === "chat" && (
        <>
          <PageHeading
            eyebrow="MOCK INTERVIEW"
            title={`${selectedCluster?.label || todayCluster?.label} 답변 준비`}
            description="메시지를 보내듯 자유롭게 답변해 보세요. AI가 바로 코칭해드립니다."
            actions={
              <Button icon={ArrowLeft} onClick={() => setView("room")}>
                Interview Room으로
              </Button>
            }
          />
          <section className="imessage-layout">
            <div className="imessage-panel">
              <div className="imessage-thread" ref={chatThreadRef}>
                {messages.map((message) => {
                  const hasCoaching = message.role === "me" && !!coachingByMessageId[message.id];
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "imessage-row",
                        message.role === "me" ? "from-me" : "from-them",
                      )}
                    >
                      <button
                        type="button"
                        className={cn(
                          "imessage-bubble",
                          message.role === "me" ? "bubble-me" : "bubble-them",
                          hasCoaching && "has-coaching",
                          hasCoaching && selectedCoachingId === message.id && "bubble-selected",
                        )}
                        disabled={!hasCoaching}
                        onClick={() => hasCoaching && setSelectedCoachingId(message.id)}
                      >
                        {message.text}
                      </button>
                      {!!message.followups?.length && (
                        <div className="imessage-followups">
                          {message.followups.map((text, index) => (
                            <button
                              key={`${message.id}-fu-${index}`}
                              className="followup-chip"
                              onClick={() => askFollowup(text)}
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {coachingLoading && (
                  <div className="imessage-row from-them">
                    <span className="imessage-typing">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                )}
              </div>
              <form
                className="imessage-input"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
              >
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="메시지 보내기"
                  rows={1}
                />
                <button type="submit" className="imessage-send" disabled={!chatInput.trim()}>
                  <ArrowUp size={16} />
                </button>
              </form>
            </div>
            <aside className="ai-coaching-panel">
              <span className="eyebrow">AI 코칭</span>
              {!selectedCoachingMessage && (
                <EmptyState title="답변을 보내면 AI 코칭이 여기 표시됩니다." />
              )}
              {selectedCoachingMessage && !selectedCoaching && (
                <div className="coaching-loading">
                  <CoachingProgressBar />
                </div>
              )}
              {selectedCoachingMessage && selectedCoaching && (
                <>
                  <blockquote className="coaching-quote">{selectedCoachingMessage.text}</blockquote>
                  <div className="coaching-score-card">
                    <div className="coaching-score-ring" style={{ "--score": selectedCoaching.score }}>
                      <span>{selectedCoaching.score}</span>
                    </div>
                    <div>
                      <span className="coaching-score-label">면접관 체감 점수</span>
                      <p className="coaching-summary">{selectedCoaching.summary}</p>
                    </div>
                  </div>
                  {!!selectedCoaching.strengths?.length && (
                    <div className="coaching-callout tone-good">
                      <div className="coaching-callout-head">
                        <Check size={14} />
                        <h4>잘한 점</h4>
                      </div>
                      <ul>
                        {selectedCoaching.strengths.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!selectedCoaching.improvements?.length && (
                    <div className="coaching-callout tone-warn">
                      <div className="coaching-callout-head">
                        <AlertCircle size={14} />
                        <h4>보완할 점</h4>
                      </div>
                      <ul>
                        {selectedCoaching.improvements.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!selectedCoaching.emphasize?.length && (
                    <div className="coaching-callout tone-info">
                      <div className="coaching-callout-head">
                        <Target size={14} />
                        <h4>강조하면 좋은 점</h4>
                      </div>
                      <ul>
                        {selectedCoaching.emphasize.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedCoaching.modelAnswer && (
                    <div className="coaching-callout tone-model">
                      <div className="coaching-callout-head">
                        <Sparkles size={14} />
                        <h4>AI 모범 답변</h4>
                      </div>
                      <p>{selectedCoaching.modelAnswer}</p>
                    </div>
                  )}
                  <Button
                    variant="primary"
                    className="cloud-primary"
                    icon={busy ? LoaderCircle : Cloud}
                    disabled={busy}
                    onClick={saveCoachedAnswer}
                  >
                    Answer Archive에 저장
                  </Button>
                </>
              )}
            </aside>
          </section>
        </>
      )}
    </div>
  );
}

function DotLoader() {
  return (
    <span className="dot-loader" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

const coachingProgressMessages = [
  "답변을 읽는 중...",
  "면접관처럼 분석하는 중...",
  "점수를 매기는 중...",
  "코칭 포인트를 정리하는 중...",
];

function CoachingProgressBar() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % coachingProgressMessages.length),
      2200,
    );
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="coaching-progress">
      <div className="coaching-progress-track">
        <div className="coaching-progress-fill" />
      </div>
      <span key={index} className="coaching-progress-label">
        {coachingProgressMessages[index]}
      </span>
    </div>
  );
}

function EmptyState({ title }) {
  return (
    <div className="empty-state">
      <Cloud size={24} />
      <strong>{title}</strong>
    </div>
  );
}

function Tracking({
  applications,
  essays,
  interviewSets,
  onAdd,
  onUpdate,
  onDelete,
  onOpenEssayEdit,
  onOpenInterviewSet,
  notify,
}) {
  const [filter, setFilter] = useState("전체");
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [essayPanel, setEssayPanel] = useState(null);
  const [setPanel, setSetPanel] = useState(null);
  const visible =
    filter === "전체"
      ? applications
      : applications.filter((row) => row.status === filter);
  const add = async (payload) => {
    setBusy(true);
    try {
      await onAdd(payload);
      setDialog(false);
    } finally {
      setBusy(false);
    }
  };
  const updateStatus = async (row, status) => {
    await onUpdate(row.id, { status });
    notify(`지원 상태를 '${status}'로 변경했습니다.`);
  };
  const updateInterviewLink = async (row, value) => {
    if (value === "__new__") {
      onOpenInterviewSet(null);
      return;
    }
    await onUpdate(row.id, { interviewSetId: value });
  };
  return (
    <div className="content-page">
      <PageHeading
        eyebrow="APPLICATION PIPELINE"
        title="Process Tracking"
        description="지원 상태와 DB에 연결된 자기소개서 · Interview Set을 한눈에 확인합니다."
        actions={
          <Button
            variant="primary"
            className="cloud-primary"
            icon={Cloud}
            onClick={() => setDialog(true)}
          >
            지원 추가
          </Button>
        }
      />
      <div className="status-tabs">
        {["전체", ...statusOptions].map((status) => (
          <button
            className={filter === status ? "active" : ""}
            key={status}
            onClick={() => setFilter(status)}
          >
            <span>{status}</span>
            <strong>
              {status === "전체"
                ? applications.length
                : applications.filter((row) => row.status === status).length}
            </strong>
          </button>
        ))}
      </div>
      <div className="tracking-board">
        <div className="tracking-board-head">
          <span>지원</span>
          <span>상태</span>
          <span>Essay</span>
          <span>Interview</span>
          <span>제출일</span>
          <span>최근 업데이트</span>
          <span />
        </div>
        <div className="tracking-board-body">
          {visible.map((row, index) => {
            const essay = essays.find((item) => item.id === row.essayId);
            const linkedSet = interviewSets.find((item) => item.id === row.interviewSetId);
            const tone = ["sky", "mint", "lemon", "lilac"][index % 4];
            return (
              <div className="tracking-row" data-status={row.status} key={row.id}>
                <div className="tracking-main">
                  <span className={`tracking-avatar tone-${tone}`}>
                    {row.company.trim().slice(0, 1) || "?"}
                  </span>
                  <div className="tracking-main-copy">
                    <strong>{row.company}</strong>
                    <span>{row.role || "직무 미정"}</span>
                  </div>
                </div>
                <div className="tracking-cell">
                  <select
                    className="tracking-status-select"
                    value={row.status}
                    onChange={(event) => updateStatus(row, event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="tracking-cell tracking-link-cell">
                  <span className={cn("tracking-link-label", !essay && "is-empty")}>
                    {essay ? `${essay.role} 자기소개서` : "연결 안 됨"}
                  </span>
                  {essay && (
                    <IconButton
                      label="자기소개서 보기"
                      className="tracking-open"
                      onClick={() => setEssayPanel(essay)}
                    >
                      <ArrowRight size={13} />
                    </IconButton>
                  )}
                </div>
                <div className="tracking-cell tracking-link-cell">
                  <select
                    className="tracking-inline-select"
                    value={row.interviewSetId || ""}
                    onChange={(event) => updateInterviewLink(row, event.target.value)}
                  >
                    <option value="">선택 안 함</option>
                    {interviewSets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.name || `${set.applicationId ? row.company : "공통"} Set`}
                      </option>
                    ))}
                    <option value="__new__">새 Set 만들기</option>
                  </select>
                  {linkedSet && (
                    <IconButton
                      label="Interview Set 보기"
                      className="tracking-open"
                      onClick={() => setSetPanel(linkedSet)}
                    >
                      <ArrowRight size={13} />
                    </IconButton>
                  )}
                </div>
                <div className="tracking-cell tracking-meta">
                  {row.submittedAt || "미제출"}
                </div>
                <div className="tracking-cell tracking-meta">
                  {relativeTime(row.updatedAt)}
                </div>
                <div className="tracking-cell tracking-row-actions">
                  <IconButton
                    label="지원 삭제"
                    className="danger-action"
                    onClick={() =>
                      window.confirm("지원 항목을 삭제할까요?") &&
                      onDelete(row.id)
                    }
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>
            );
          })}
          {!visible.length && (
            <EmptyState title="이 상태의 지원 항목이 없습니다." />
          )}
        </div>
      </div>
      <ApplicationPanel
        open={dialog}
        onClose={() => setDialog(false)}
        onSave={add}
        busy={busy}
        essays={essays}
      />
      <EssaySidePanel
        essay={essayPanel}
        onClose={() => setEssayPanel(null)}
        onEdit={(essay) => {
          setEssayPanel(null);
          onOpenEssayEdit(essay);
        }}
        editLabel="Writing으로 이동"
      />
      <InterviewSetSidePanel
        set={setPanel}
        onClose={() => setSetPanel(null)}
        onOpen={(set) => {
          setSetPanel(null);
          onOpenInterviewSet(set);
        }}
      />
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState({
    googleClientId: "",
    llmEnabled: false,
    model: "gpt-5-mini",
    llmProvider: "demo",
    demoAuthEnabled: true,
  });
  const [user, setUser] = useState(undefined);
  const [authMessage, setAuthMessage] =
    useState("로그인 정보를 확인하는 중입니다.");
  const [data, setData] = useState(blankData);
  const [loadingData, setLoadingData] = useState(false);
  const [page, setPage] = useState(() => {
    const hashPage = window.location.hash.slice(1);
    if (window.location.pathname === "/content") return hashPage || "archive";
    if (window.location.pathname === "/auth/callback") return "archive";
    return hashPage || "archive";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeEssayId, setActiveEssayId] = useState("");
  const [archiveExperienceId, setArchiveExperienceId] = useState("");
  const [interviewSetFocus, setInterviewSetFocus] = useState(null);
  const [expanded, setExpanded] = useState("source");
  const [toast, setToast] = useState("");
  const [generating, setGenerating] = useState(false);
  const toastTimer = useRef();

  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }, []);
  const enterContent = useCallback((nextUser, nextPage = "archive") => {
    setUser(nextUser);
    setPage(nextPage);
    window.history.replaceState({ page: nextPage }, "", `/content#${nextPage}`);
  }, []);
  const hasEnteredRef = useRef(false);
  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingData(true);
      try {
        const next = await api("/api/bootstrap");
        setData(next);
        setActiveEssayId((current) =>
          current && next.essays.some((essay) => essay.id === current)
            ? current
            : next.essays[0]?.id || "",
        );
        return next;
      } catch (error) {
        if (error.message === "로그인이 필요합니다.") setUser(null);
        else notify(error.message);
        return null;
      } finally {
        if (!silent) setLoadingData(false);
      }
    },
    [notify],
  );
  useEffect(() => {
    let active = true;
    const loadAuth = async () => {
      try {
        const nextConfig = await api("/api/config");
        if (active) setConfig(nextConfig);
        if (supabase) {
          const isCallback = window.location.pathname === "/auth/callback";
          const params = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(
            window.location.hash.replace(/^#/, ""),
          );
          const callbackError =
            params.get("error_description") ||
            params.get("error") ||
            hashParams.get("error_description") ||
            hashParams.get("error");

          if (callbackError) {
            throw new Error(callbackError);
          }

          if (isCallback && params.has("code")) {
            setAuthMessage("Google 로그인 결과를 확인하는 중입니다.");
            const { error } = await supabase.auth.exchangeCodeForSession(
              params.get("code"),
            );
            if (error) throw error;
          }

          const { data } = await supabase.auth.getSession();
          if (!active) return;
          if (data.session?.user) {
            hasEnteredRef.current = true;
            enterContent(supabaseUser(data.session.user), window.location.hash.slice(1) || "archive");
          } else {
            setUser(null);
          }
        } else {
          const session = await api("/api/session");
          if (active) setUser(session.user || null);
        }
      } catch (error) {
        if (active) {
          setUser(null);
          if (window.location.pathname === "/auth/callback") {
            window.history.replaceState({}, "", "/");
            notify(error.message || "로그인을 완료하지 못했습니다.");
          }
        }
      }
    };
    loadAuth();
    if (!supabase)
      return () => {
        active = false;
      };
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        if (session?.user) {
          // Supabase re-fires this on token refresh / tab refocus, not just
          // real sign-in — only the FIRST time should it jump to a page;
          // afterwards just keep the user identity fresh and leave page/URL alone.
          if (hasEnteredRef.current) {
            setUser(supabaseUser(session.user));
          } else {
            hasEnteredRef.current = true;
            enterContent(supabaseUser(session.user), window.location.hash.slice(1) || "archive");
          }
        } else {
          hasEnteredRef.current = false;
          setUser(null);
        }
      },
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [enterContent, notify]);
  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);
  useEffect(() => {
    if (!user) return undefined;
    if (window.location.pathname !== "/content") {
      window.history.replaceState({ page }, "", `/content#${page}`);
    }
    const onPopState = (event) => {
      window.dispatchEvent(new Event("wishport:flush"));
      setPage(event.state?.page || "archive");
      if (event.state?.essayId) setActiveEssayId(event.state.essayId);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [user]);
  const navigate = useCallback(
    (nextPage, essayId = activeEssayId, replace = false) => {
      setPage(nextPage);
      setExpanded(nextPage);
      window.history[replace ? "replaceState" : "pushState"](
        { page: nextPage, essayId },
        "",
        `/content#${nextPage}`,
      );
    },
    [activeEssayId],
  );
  const mutate = useCallback(
    async (path, method, payload, message, silent = false) => {
      const body = await api(path, {
        method,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      await loadData(true);
      if (message && !silent) notify(message);
      return body;
    },
    [loadData, notify],
  );

  const activeEssay =
    data.essays.find((essay) => essay.id === activeEssayId) || data.essays[0];
  const saveEssay = (patch, silent = true) =>
    mutate(
      `/api/essays/${activeEssay.id}`,
      "PATCH",
      patch,
      silent ? "" : "자기소개서를 저장했습니다.",
      silent,
    );
  const saveQuestion = (id, patch, silent = false) =>
    mutate(
      `/api/questions/${id}`,
      "PATCH",
      patch,
      silent ? "" : "문항을 저장했습니다.",
      silent,
    );
  const selectQuestion = async (index) => {
    if (activeEssay.activeQuestion !== index)
      await mutate(
        `/api/essays/${activeEssay.id}`,
        "PATCH",
        { activeQuestion: index },
        "",
        true,
      );
  };
  const startEssay = async () => {
    try {
      const body = await api("/api/essays", {
        method: "POST",
        body: JSON.stringify({ company: "새 지원", role: "직무 미정" }),
      });
      setActiveEssayId(body.essay.id);
      await loadData(true);
      navigate("source", body.essay.id);
      notify("새 자기소개서를 만들었습니다.");
    } catch (error) {
      notify(error.message);
    }
  };
  const openEssay = (essay) => {
    setActiveEssayId(essay.id);
    navigate(workflowSteps[Math.min(essay.currentStep, 2)].id, essay.id);
  };
  const workflowNavigate = async (step) => {
    const index = workflowSteps.findIndex((item) => item.id === step);
    if (index < 0 || index > activeEssay.maxStep || step === "complete") return;
    await mutate(
      `/api/essays/${activeEssay.id}`,
      "PATCH",
      { currentStep: index },
      "",
      true,
    );
    navigate(step, activeEssay.id);
  };
  const advance = async (nextPage) => {
    const index = workflowSteps.findIndex((item) => item.id === nextPage);
    await mutate(
      `/api/essays/${activeEssay.id}`,
      "PATCH",
      { currentStep: index, maxStep: index },
      "",
      true,
    );
    navigate(nextPage, activeEssay.id);
  };
  const generate = async (questionId, mode, feedback = "") => {
    setGenerating(true);
    try {
      const body = await api("/api/llm/essay", {
        method: "POST",
        body: JSON.stringify({ questionId, mode, feedback }),
      });
      await mutate(
        `/api/essays/${activeEssay.id}`,
        "PATCH",
        { currentStep: 2, maxStep: 2 },
        "",
        true,
      );
      navigate("editor", activeEssay.id);
      notify(
        body.provider === "gemini"
          ? "Gemini가 선택한 근거로 문항 초안을 저장했습니다."
          : body.provider === "openai"
            ? "OpenAI가 선택한 근거로 문항 초안을 저장했습니다."
            : "데모 응답으로 문항 초안을 저장했습니다. 실제 생성은 LLM 키를 확인해 주세요.",
      );
    } catch (error) {
      notify(error.message);
    } finally {
      setGenerating(false);
    }
  };
  const completeEssay = async () => {
    await mutate(
      `/api/essays/${activeEssay.id}`,
      "PATCH",
      { status: "완료", currentStep: 2, maxStep: 3 },
      "자기소개서 작성을 완료했습니다.",
    );
    navigate("writing");
  };
  const logout = async () => {
    await api("/api/logout", { method: "POST" });
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setData(blankData);
    setPage("archive");
    window.history.replaceState({}, "", "/");
  };
  const saveExperience = async (payload, id) => {
    const body = await mutate(
      id ? `/api/experiences/${id}` : "/api/experiences",
      id ? "PATCH" : "POST",
      payload,
      id ? "경험을 수정했습니다." : "새 경험을 저장했습니다.",
    );
    return body.experience;
  };
  const createItem = async (payload) =>
    (
      await mutate(
        "/api/archive-items",
        "POST",
        payload,
        "항목을 추가했습니다.",
      )
    ).item;
  const updateItem = async (id, payload) =>
    (
      await mutate(
        `/api/archive-items/${id}`,
        "PATCH",
        payload,
        "항목을 저장했습니다.",
      )
    ).item;
  const appPage = useMemo(
    () =>
      ["archive", "writing", "interview", "tracking"].includes(page)
        ? page
        : "writing",
    [page],
  );

  if (user === undefined)
    return (
      <div className="app-loading">
        <Cloud size={28} fill="currentColor" />
        <DotLoader />
        <span>{authMessage}</span>
      </div>
    );
  if (!user)
    return (
      <>
        <LandingPage
          config={config}
          onSignedIn={enterContent}
          notify={notify}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  if (loadingData || !data.profile)
    return (
      <div className="app-loading">
        <DotLoader />
        <span>Archive를 불러오는 중입니다.</span>
      </div>
    );

  let content;
  if (page === "archive")
    content = (
      <ArchiveOverview data={data} onEdit={() => navigate("archive-edit")} />
    );
  if (page === "archive-edit")
    content = (
      <ArchiveEditor
        data={data}
        initialExperienceId={archiveExperienceId}
        onBack={() => {
          setArchiveExperienceId("");
          navigate("archive");
        }}
        onSaveProfile={(profile) =>
          mutate("/api/profile", "PATCH", profile, "기본정보를 저장했습니다.")
        }
        onSaveExperience={saveExperience}
        onDeleteExperience={(id) =>
          mutate(
            `/api/experiences/${id}`,
            "DELETE",
            undefined,
            "경험을 삭제하고 문항 연결도 정리했습니다.",
          )
        }
        onCreateItem={createItem}
        onUpdateItem={updateItem}
        onDeleteItem={(id) =>
          mutate(
            `/api/archive-items/${id}`,
            "DELETE",
            undefined,
            "항목을 삭제했습니다.",
          )
        }
        notify={notify}
      />
    );
  if (page === "writing")
    content = (
      <WritingHouse
        data={data}
        onNew={startEssay}
        onOpen={openEssay}
        onDelete={(essay) =>
          window.confirm(`'${essay.company}' 자기소개서를 삭제할까요?`) &&
          mutate(
            `/api/essays/${essay.id}`,
            "DELETE",
            undefined,
            "자기소개서를 삭제했습니다.",
          )
        }
      />
    );
  if (activeEssay && page === "source")
    content = (
      <SourceIntake
        essay={activeEssay}
        onSaveEssay={saveEssay}
        onSaveQuestion={saveQuestion}
        onAddQuestion={() =>
          mutate(
            `/api/essays/${activeEssay.id}/questions`,
            "POST",
            { prompt: "새 자기소개서 문항", charLimit: 600 },
            "문항을 추가했습니다.",
          )
        }
        onDeleteQuestion={(id) =>
          window.confirm("이 문항과 작성된 초안을 삭제할까요?") &&
          mutate(
            `/api/questions/${id}`,
            "DELETE",
            undefined,
            "문항을 삭제했습니다.",
          )
        }
        onHome={() => navigate("writing")}
        onBack={() => navigate("writing")}
        onNext={() => advance("design")}
        expanded={expanded}
        setExpanded={setExpanded}
        onStep={workflowNavigate}
        notify={notify}
      />
    );
  if (activeEssay && page === "design")
    content = (
      <EssayDesign
        essay={activeEssay}
        experiences={data.experiences}
        onSelectQuestion={selectQuestion}
        onSetContext={(questionId, experienceIds) =>
          mutate(
            `/api/questions/${questionId}/context`,
            "PUT",
            { experienceIds },
            "문항의 경험 연결을 저장했습니다.",
          )
        }
        onSaveEssay={saveEssay}
        onHome={() => navigate("writing")}
        onBack={() => workflowNavigate("source")}
        onNext={() => advance("editor")}
        expanded={expanded}
        setExpanded={setExpanded}
        onStep={workflowNavigate}
        busy={generating}
      />
    );
  if (activeEssay && page === "editor")
    content = (
      <WritingFeedback
        essay={activeEssay}
        experiences={data.experiences}
        apiConfig={config}
        onSelectQuestion={selectQuestion}
        onSaveQuestion={saveQuestion}
        onGenerate={generate}
        onHome={() => navigate("writing")}
        onBack={() => workflowNavigate("design")}
        onComplete={completeEssay}
        expanded={expanded}
        setExpanded={setExpanded}
        onStep={workflowNavigate}
        busy={generating}
      />
    );
  if (page === "interview")
    content = (
      <Interview
        data={data}
        apiConfig={config}
        onReload={() => loadData(true)}
        notify={notify}
        onOpenArchive={() => navigate("archive-edit")}
        focusSet={interviewSetFocus}
      />
    );
  if (page === "tracking")
    content = (
      <Tracking
        applications={data.applications}
        essays={data.essays}
        interviewSets={data.interview.sets || []}
        onAdd={(payload) =>
          mutate(
            "/api/applications",
            "POST",
            payload,
            "지원 항목을 추가했습니다.",
          )
        }
        onUpdate={(id, payload) =>
          mutate(`/api/applications/${id}`, "PATCH", payload, "", true)
        }
        onDelete={(id) =>
          mutate(
            `/api/applications/${id}`,
            "DELETE",
            undefined,
            "지원 항목을 삭제했습니다.",
          )
        }
        onOpenEssayEdit={openEssay}
        onOpenInterviewSet={(set) => {
          setInterviewSetFocus({ id: set?.id || "", token: Date.now() });
          navigate("interview");
        }}
        notify={notify}
      />
    );
  if (!content)
    content = (
      <div className="content-page">
        <EmptyState title="화면을 불러오지 못했습니다." />
      </div>
    );
  const focused = ["archive-edit", "source", "design", "editor"].includes(page);
  return (
    <ContentPage
      header={
        !focused && (
          <AppHeader
            page={appPage}
            onNavigate={navigate}
            user={user}
            onLogout={logout}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />
        )
      }
      toast={toast}
    >
      {content}
    </ContentPage>
  );
}
