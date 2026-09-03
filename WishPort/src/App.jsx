import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
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

const workflowSteps = [
  { id: "source", label: "지원 자료", caption: "공고와 문항", tone: "sky" },
  { id: "design", label: "문항 설계", caption: "근거와 규칙", tone: "lemon" },
  { id: "editor", label: "초안과 피드백", caption: "문장 단위 수정", tone: "lilac" },
  { id: "complete", label: "완료", caption: "최종 체크", tone: "mint" },
];

const statusOptions = ["지원 예정", "제출", "서류합격", "면접", "최종합격", "불합격"];
const blankData = { profile: null, experiences: [], archiveItems: [], essays: [], applications: [] };
const blankStar = { situation: "", task: "", action: "", result: "" };

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
  return body;
}

function relativeTime(value) {
  if (!value) return "-";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
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

function Button({ children, className, variant = "default", icon: Icon, ...props }) {
  return (
    <button className={cn("button", `button-${variant}`, className)} {...props}>
      {Icon && <Icon size={16} strokeWidth={1.8} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

function IconButton({ label, children, className, ...props }) {
  return <button className={cn("icon-button", className)} aria-label={label} title={label} {...props}>{children}</button>;
}

function Chip({ children, tone = "material", removable, onRemove }) {
  return (
    <span className={cn("chip", `chip-${tone}`)}>
      {children}
      {removable && <button aria-label={`${children} 제거`} onClick={onRemove}><X size={12} /></button>}
    </span>
  );
}

function Field({ label, value, onChange, textarea, ...props }) {
  const Component = textarea ? "textarea" : "input";
  return <label className={cn("field-group", textarea && "field-wide")}><span>{label}</span><Component value={value ?? ""} onChange={(event) => onChange(event.target.value)} {...props} /></label>;
}

function AppHeader({ page, onNavigate, user, onLogout, mobileOpen, setMobileOpen }) {
  const nav = [
    ["archive", "Archive", LayoutDashboard],
    ["writing", "Writing House", FilePenLine],
    ["tracking", "State Tracking", Target],
  ];
  return (
    <header className="app-header no-print">
      <button className="header-brand" onClick={() => onNavigate("archive")}><Cloud size={21} fill="currentColor" /><span>Wish Port</span></button>
      <nav className={cn("main-nav", mobileOpen && "is-open")} aria-label="주요 메뉴">
        {nav.map(([id, label, Icon]) => (
          <button key={id} className={page === id ? "active" : ""} onClick={() => { onNavigate(id); setMobileOpen(false); }}>
            <Icon size={16} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="header-account">
        <div className="account-copy"><strong>{user?.name}</strong><span>{user?.email}</span></div>
        <button className="avatar-button" title="로그아웃" onClick={onLogout}>
          {user?.picture ? <img src={user.picture} alt="" /> : <CircleUserRound size={22} />}
          <LogOut size={13} className="logout-mark" />
        </button>
        <IconButton label="메뉴" className="mobile-menu" onClick={() => setMobileOpen((value) => !value)}><Menu size={20} /></IconButton>
      </div>
    </header>
  );
}

function FocusHeader({ title, status, onHome, onBack, actionLabel, onAction, busy, finalAction = false, actionDisabled = false, cloudAction = false }) {
  return (
    <header className="focus-header">
      <div className="focus-side focus-left">
        <IconButton label="Writing House 홈" className="cloud-home" onClick={() => { window.dispatchEvent(new Event("wishport:flush")); onHome(); }}><Cloud size={18} fill="currentColor" /></IconButton>
        <Button icon={ArrowLeft} onClick={onBack}>이전 단계</Button>
      </div>
      <div className="focus-title"><strong>{title}</strong><span>{status}</span></div>
      <div className="focus-side focus-right">
        <Button variant={finalAction ? "complete" : "primary"} icon={busy ? LoaderCircle : cloudAction ? Cloud : finalAction ? Check : ArrowRight} className={cn(busy && "is-loading", cloudAction && "cloud-primary")} onClick={onAction} disabled={busy || actionDisabled}>{actionLabel}</Button>
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
          <div className={cn("rail-step", active && "active", done && "done", !accessible && "locked", `tone-${step.tone}`)} key={step.id}>
            <button className="rail-step-button" aria-expanded={open} aria-disabled={!accessible} onClick={() => {
              setExpanded(open ? "" : step.id);
              if (accessible && step.id !== "complete") onStep(step.id);
            }}>
              <span className="rail-dot">{done ? <Check size={13} /> : index + 1}</span>
              <span className="rail-label"><strong>{step.label}</strong><small>{step.caption}</small></span>
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
            const body = await api("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
            onSignedIn(body.user);
          } catch (error) {
            notify(error.message);
          } finally {
            setLoading(false);
          }
        },
      });
      googleRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleRef.current, { theme: "outline", size: "large", width: 320, text: "continue_with", locale: "ko" });
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

  const demoLogin = async () => {
    setLoading(true);
    try {
      const body = await api("/api/auth/demo", { method: "POST" });
      onSignedIn(body.user);
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="landing-page">
      <div className="cloud-mark cloud-one"><Cloud /></div><div className="cloud-mark cloud-two"><Cloud /></div>
      <section className="landing-content">
        <div className="landing-kicker"><Cloud size={17} fill="currentColor" /> Career Context Workspace</div>
        <h1>Wish Port</h1>
        <p>흩어진 경험을 한 번 정리하고,<br />필요한 순간에 다시 꺼내 쓰세요.</p>
        <div className="landing-flow">{["ARCHIVE", "SELECT", "WRITE", "REFINE", "TRACK"].map((item, index) => <span key={item}>{item}{index < 4 && <ArrowRight size={12} />}</span>)}</div>
        <div className="login-area">
          {config.googleClientId && <div ref={googleRef} className={cn("google-slot", loading && "loading")} />}
          {config.demoAuthEnabled && <Button onClick={demoLogin} disabled={loading} icon={loading ? LoaderCircle : CircleUserRound} className={loading ? "is-loading" : ""}>데모 계정으로 계속하기</Button>}
        </div>
        <small>Archive가 기억하고, AI가 해석하고, 사용자가 선택합니다.</small>
      </section>
    </main>
  );
}

function PageHeading({ eyebrow, title, description, actions }) {
  return <div className="page-heading no-print"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>;
}

function ResumeSection({ title, meta, children }) {
  return <section className="standard-resume-section"><div className="standard-section-title"><h3>{title}</h3>{meta && <span>{meta}</span>}</div>{children}</section>;
}

function ArchiveOverview({ data, onEdit }) {
  const { profile, experiences, archiveItems } = data;
  const achievements = archiveItems.filter((item) => item.kind === "achievement");
  const assets = archiveItems.filter((item) => item.kind === "asset");
  const downloadArchive = (format) => {
    const exportData = { exportedAt: new Date().toISOString(), profile, experiences, achievements, assets };
    const lines = [
      `Wish Port Career Archive - ${profile.name}`,
      `Exported: ${exportData.exportedAt}`,
      "", "[PROFILE]",
      ...Object.entries(profile).filter(([key]) => key !== "photoData").map(([key, value]) => `${key}: ${value || ""}`),
      "", "[EXPERIENCES]",
      ...experiences.flatMap((item, index) => [
        `${index + 1}. ${item.title} (${item.meta})`, `Summary: ${item.summary}`, `Evidence: ${item.evidence}`,
        `S: ${item.star?.situation || ""}`, `T: ${item.star?.task || ""}`, `A: ${item.star?.action || ""}`, `R: ${item.star?.result || ""}`,
        `Tags: ${item.chips.map(([label, tone]) => `${tone}:${label}`).join(", ")}`, "",
      ]),
      "[AWARDS & CERTIFICATES]", ...achievements.map((item) => `${item.title}: ${item.detail}`),
      "", "[ASSETS]", ...assets.map((item) => `${item.title}: ${item.detail}`),
    ];
    const content = format === "json" ? JSON.stringify(exportData, null, 2) : lines.join("\n");
    const blob = new Blob([content], { type: format === "json" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wish-port-${profile.name || "archive"}.${format}`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="content-page archive-overview-page">
      <PageHeading eyebrow="CAREER ARCHIVE" title="Resume Overview" description="편집 내용이 반영된 읽기 전용 이력서입니다." actions={<><Button icon={Download} onClick={() => downloadArchive("json")}>JSON</Button><Button icon={Download} onClick={() => downloadArchive("txt")}>TXT</Button><Button icon={Printer} onClick={() => window.print()}>PDF로 인쇄</Button><Button variant="primary" className="cloud-primary" icon={Cloud} onClick={onEdit}>아카이브 편집</Button></>} />
      <article className="standard-resume" aria-label="한 페이지 이력서">
        <header className="standard-resume-header">
          <div className={cn("standard-photo", profile.photoData && "has-photo")}>{profile.photoData ? <img src={profile.photoData} alt={`${profile.name} 증명사진`} /> : "PHOTO"}</div>
          <div className="standard-identity">
            <h1>{profile.name}</h1><h2>{profile.role}</h2>
            <div className="standard-contact"><span>{profile.email}</span><span>{profile.phone}</span><span>{profile.location}</span><span>{profile.website}</span><span>{profile.github}</span></div>
          </div>
        </header>
        <div className="standard-resume-body">
          <ResumeSection title="Education" meta={profile.educationPeriod}><div className="resume-entry"><div><strong>{profile.school}</strong><span>{profile.major}</span></div><b>GPA {profile.gpa}</b></div></ResumeSection>
          <ResumeSection title="Career" meta={profile.careerPeriod}><div className="resume-entry resume-entry-copy"><div><strong>{profile.careerTitle || "경력 정보를 입력해 주세요"}</strong><p>{profile.careerSummary}</p></div></div></ResumeSection>
          <ResumeSection title="Projects" meta={`${experiences.length} experiences`}><div className="standard-project-list">{experiences.map((experience) => <div className="standard-project" key={experience.id}><div className="standard-project-head"><strong>{experience.title}</strong><span>{experience.meta}</span></div><p>{experience.summary}</p><div className="standard-tags">{experience.chips.slice(0, 4).map(([label, tone]) => <Chip tone={tone} key={`${tone}-${label}`}>{label}</Chip>)}</div></div>)}</div></ResumeSection>
          <div className="standard-bottom-grid">
            <ResumeSection title="Awards & Certificates">{achievements.map((item) => <div className="compact-entry" key={item.id}><strong>{item.title}</strong><span>{item.detail}</span></div>)}</ResumeSection>
            <ResumeSection title="Skills & Links">{assets.map((item) => <div className="compact-entry" key={item.id}><strong>{item.title}</strong><span>{item.detail}</span></div>)}</ResumeSection>
          </div>
        </div>
      </article>
    </div>
  );
}

function ArchiveSidebar({ data, selection, onSelect, onNewExperience, onNewItem, onDeleteExperience, onDeleteItem }) {
  const basics = [
    ["personal", "인적사항", UserRound],
    ["photo", "증명사진", ImageUp],
    ["education", "학력", GraduationCap],
    ["career", "경력", BriefcaseBusiness],
    ["web", "웹사이트 · 링크", Globe2],
  ];
  const row = (id, type, title, Icon, onDelete) => <div className={cn("archive-nav-row", selection.type === type && selection.id === id && "active")} key={id}><button onClick={() => onSelect({ type, id })}>{Icon && <Icon size={14} />}<span>{title}</span></button>{onDelete && <IconButton label={`${title} 삭제`} className="danger-action" onClick={onDelete}><Trash2 size={14} /></IconButton>}</div>;
  return (
    <aside className="archive-editor-sidebar">
      <div className="archive-nav-group"><span className="eyebrow">BASIC PROFILE</span>{basics.map(([id, title, Icon]) => row(id, "profile", title, Icon))}</div>
      <div className="archive-nav-group"><div className="archive-nav-title"><span className="eyebrow">EXPERIENCES</span><IconButton label="경험 추가" onClick={onNewExperience}><Plus size={14} /></IconButton></div>{data.experiences.map((item) => row(item.id, "experience", item.title, null, () => onDeleteExperience(item)))}</div>
      <div className="archive-nav-group"><div className="archive-nav-title"><span className="eyebrow">AWARDS</span><IconButton label="성과 추가" onClick={() => onNewItem("achievement")}><Plus size={14} /></IconButton></div>{data.archiveItems.filter((item) => item.kind === "achievement").map((item) => row(item.id, "item", item.title, null, () => onDeleteItem(item)))}</div>
      <div className="archive-nav-group"><div className="archive-nav-title"><span className="eyebrow">ASSETS</span><IconButton label="Asset 추가" onClick={() => onNewItem("asset")}><Plus size={14} /></IconButton></div>{data.archiveItems.filter((item) => item.kind === "asset").map((item) => row(item.id, "item", item.title, null, () => onDeleteItem(item)))}</div>
    </aside>
  );
}

function ProfileEditor({ profile, section, onSave }) {
  const [form, setForm] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setForm(profile); setDirty(false); }, [profile, section]);
  useUnsavedWarning(dirty);
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); };
  const configs = {
    personal: { eyebrow: "PERSONAL", title: "인적사항", description: "이력서 상단에 표시할 기본 연락처입니다.", fields: [["name", "이름"], ["role", "직무 / 소개"], ["email", "이메일"], ["phone", "전화번호"], ["location", "지역"]] },
    education: { eyebrow: "EDUCATION", title: "학력", description: "학교, 전공과 재학 기간을 관리합니다.", fields: [["school", "학교명"], ["major", "전공"], ["gpa", "학점"], ["educationPeriod", "재학 기간"]] },
    career: { eyebrow: "CAREER", title: "경력", description: "대표 경력과 담당 업무를 정리합니다.", fields: [["careerTitle", "회사 / 역할"], ["careerPeriod", "근무 기간"], ["careerSummary", "담당 업무", true]] },
    web: { eyebrow: "LINKS", title: "웹사이트 · 링크", description: "채용 담당자가 확인할 포트폴리오와 개발 링크입니다.", fields: [["website", "포트폴리오"], ["github", "GitHub"]] },
  };
  const config = configs[section] || configs.personal;
  const save = async () => { setBusy(true); try { await onSave(form); setDirty(false); } finally { setBusy(false); } };
  return <EditorCanvas eyebrow={config.eyebrow} title={config.title} description={config.description} actions={<Button variant="primary" icon={busy ? LoaderCircle : Save} className={busy ? "is-loading" : ""} onClick={save} disabled={busy || !dirty}>변경 저장</Button>}><div className="form-grid">{config.fields.map(([key, label, textarea]) => <Field key={key} label={label} textarea={textarea} value={form[key]} onChange={(value) => set(key, value)} />)}</div></EditorCanvas>;
}

function PhotoEditor({ profile, onSave, notify }) {
  const [photoData, setPhotoData] = useState(profile.photoData || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setPhotoData(profile.photoData || ""), [profile.photoData]);
  const pickPhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("이미지 파일만 업로드할 수 있습니다.");
    if (file.size > 2_500_000) return notify("사진은 2.5MB 이하로 올려 주세요.");
    const reader = new FileReader();
    reader.onload = () => setPhotoData(String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  const save = async () => {
    setBusy(true);
    try { await onSave({ ...profile, photoData }); } finally { setBusy(false); }
  };
  return <EditorCanvas eyebrow="PROFILE PHOTO" title="증명사진" description="이력서 왼쪽 상단에 표시할 세로형 프로필 사진을 등록합니다." actions={<Button variant="primary" icon={busy ? LoaderCircle : Save} className={busy ? "is-loading" : ""} onClick={save} disabled={busy || photoData === (profile.photoData || "")}>사진 저장</Button>}><div className="photo-editor"><div className={cn("photo-preview", photoData && "has-photo")}>{photoData ? <img src={photoData} alt="업로드한 증명사진 미리보기" /> : <ImageUp size={34} />}</div><div className="photo-controls"><label className="photo-upload"><ImageUp size={18} /><span>사진 선택</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => pickPhoto(event.target.files?.[0])} /></label><p>JPG, PNG, WebP · 최대 2.5MB · 3:4 비율 권장</p>{photoData && <Button icon={Trash2} onClick={() => setPhotoData("")}>사진 제거</Button>}</div></div></EditorCanvas>;
}

function ExperienceEditor({ experience, onSave, isNew }) {
  const [form, setForm] = useState(experience || { title: "", meta: "", summary: "", evidence: "", star: blankStar, chips: [] });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(experience || { title: "", meta: "", summary: "", evidence: "", star: blankStar, chips: [] }), [experience]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setStar = (key, value) => setForm((current) => ({ ...current, star: { ...current.star, [key]: value } }));
  const chipByTone = (tone) => form.chips.find((item) => item[1] === tone)?.[0] || "";
  const setChip = (tone, value) => setForm((current) => ({ ...current, chips: [...current.chips.filter((item) => item[1] !== tone), ...(value.trim() ? [[value, tone]] : [])] }));
  const save = async () => { setBusy(true); try { await onSave(form); } finally { setBusy(false); } };
  return <EditorCanvas eyebrow="EXPERIENCE" title={isNew ? "새 경험 추가" : experience.title} description="프로젝트 정보와 자기소개서 근거로 사용할 STAR 내용을 함께 저장합니다." actions={<Button variant="primary" icon={busy ? LoaderCircle : Save} className={busy ? "is-loading" : ""} onClick={save} disabled={busy || !form.title.trim()}>경험 저장</Button>}><div className="form-grid"><Field label="프로젝트명" value={form.title} onChange={(value) => set("title", value)} /><Field label="역할 · 유형" value={form.meta} onChange={(value) => set("meta", value)} /><Field textarea label="이력서용 요약" value={form.summary} onChange={(value) => set("summary", value)} /><Field textarea label="원본 근거" value={form.evidence} onChange={(value) => set("evidence", value)} /></div><div className="editor-subsection"><div><span className="eyebrow">STAR EVIDENCE</span><h3>문항 작성 근거</h3></div><div className="star-form-grid">{[["situation", "S · Situation", "어떤 상황이었나요?"], ["task", "T · Task", "해결해야 한 과제는?"], ["action", "A · Action", "직접 한 행동은?"], ["result", "R · Result", "확인된 결과는?"]].map(([key, label, placeholder]) => <Field textarea key={key} label={label} placeholder={placeholder} value={form.star?.[key]} onChange={(value) => setStar(key, value)} />)}</div></div><div className="editor-subsection"><span className="eyebrow">STRUCTURED TAGS</span><div className="context-field-grid">{[["material", "Material"], ["result", "Result"], ["skill", "Skill"], ["output", "Output"]].map(([tone, label]) => <label className={`context-field tone-${tone}`} key={tone}><span>{label}</span><input value={chipByTone(tone)} onChange={(event) => setChip(tone, event.target.value)} /></label>)}</div></div></EditorCanvas>;
}

function ArchiveItemEditor({ item, kind, onSave, isNew }) {
  const [form, setForm] = useState(item || { kind, title: "", detail: "", tone: kind === "asset" ? "lilac" : "mint" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(item || { kind, title: "", detail: "", tone: kind === "asset" ? "lilac" : "mint" }), [item, kind]);
  const save = async () => { setBusy(true); try { await onSave(form); } finally { setBusy(false); } };
  return <EditorCanvas eyebrow={kind === "asset" ? "ASSET" : "AWARD"} title={isNew ? (kind === "asset" ? "새 Asset" : "새 성과 · 자격") : item.title} description={kind === "asset" ? "스킬, 링크와 증빙 자료를 입력합니다." : "수상, 자격과 발급 정보를 입력합니다."} actions={<Button variant="primary" icon={busy ? LoaderCircle : Save} className={busy ? "is-loading" : ""} onClick={save} disabled={busy || !form.title.trim()}>항목 저장</Button>}><div className="form-grid"><Field label="항목명" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} /><Field label="세부 정보" value={form.detail} onChange={(value) => setForm((current) => ({ ...current, detail: value }))} /></div></EditorCanvas>;
}

function EditorCanvas({ eyebrow, title, description, actions, children }) {
  return <section className="archive-editor-canvas"><div className="editor-canvas-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions}</div><div className="editor-canvas-body">{children}</div></section>;
}

function ArchiveEditor({ data, initialExperienceId, onBack, onSaveProfile, onSaveExperience, onDeleteExperience, onCreateItem, onUpdateItem, onDeleteItem, notify }) {
  const [selection, setSelection] = useState(initialExperienceId ? { type: "experience", id: initialExperienceId } : { type: "profile", id: "personal" });
  const selectedExperience = data.experiences.find((item) => item.id === selection.id);
  const selectedItem = data.archiveItems.find((item) => item.id === selection.id);
  const newExperience = selection.type === "new-experience";
  const newItemKind = selection.type === "new-item" ? selection.id : "";
  const removeExperience = async (item) => {
    if (!window.confirm(`'${item.title}' 경험을 삭제할까요? 연결된 문항에서는 이 경험만 제거됩니다.`)) return;
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
    const saved = selectedItem ? await onUpdateItem(selectedItem.id, payload) : await onCreateItem(payload);
    setSelection({ type: "item", id: saved.id });
  };
  let editor = selection.type === "profile" && selection.id === "photo" ? <PhotoEditor profile={data.profile} onSave={onSaveProfile} notify={notify} /> : <ProfileEditor profile={data.profile} section={selection.id} onSave={onSaveProfile} />;
  if (selection.type === "experience" || newExperience) editor = <ExperienceEditor key={selectedExperience?.id || "new"} experience={selectedExperience} isNew={newExperience} onSave={saveExperience} />;
  if (selection.type === "item" || newItemKind) editor = <ArchiveItemEditor key={selectedItem?.id || newItemKind} item={selectedItem} kind={selectedItem?.kind || newItemKind} isNew={Boolean(newItemKind)} onSave={saveItem} />;
  return <div className="focus-page archive-edit-page"><FocusHeader title="Career Archive Editor" status="DB 자동 연동" onHome={onBack} onBack={onBack} actionLabel="편집 완료" cloudAction onAction={() => { notify("Archive 편집을 마쳤습니다."); onBack(); }} /><div className="archive-editor-layout"><ArchiveSidebar data={data} selection={selection} onSelect={setSelection} onNewExperience={() => setSelection({ type: "new-experience", id: "new" })} onNewItem={(kind) => setSelection({ type: "new-item", id: kind })} onDeleteExperience={removeExperience} onDeleteItem={removeItem} />{editor}</div></div>;
}

function WritingStats({ data }) {
  const chipCount = data.experiences.reduce((count, item) => count + item.chips.length, 0);
  return <div className="writing-stats"><div className="stat stat-sky"><span>활용 가능 경험</span><strong>{data.experiences.length}</strong></div><div className="stat stat-lemon"><span>구조화 소재</span><strong>{chipCount}</strong></div><div className="stat stat-mint"><span>성과 · 자격</span><strong>{data.archiveItems.filter((item) => item.kind === "achievement").length}</strong></div><div className="stat stat-lilac"><span>Assets</span><strong>{data.archiveItems.filter((item) => item.kind === "asset").length}</strong></div></div>;
}

function WritingHouse({ data, onNew, onOpen, onDelete }) {
  const progress = (essay) => essay.status === "완료" ? 100 : Math.min(90, 16 + essay.maxStep * 34);
  const stage = (essay) => essay.status === "완료" ? "완료" : workflowSteps[Math.min(essay.currentStep, 2)].label;
  return <div className="content-page"><PageHeading eyebrow="WRITING WORKSPACE" title="Writing House" description="Archive의 근거를 선택해 기업·직무별 자기소개서를 작성합니다." actions={<Button variant="primary" className="cloud-primary" icon={Cloud} onClick={onNew}>자기소개서 만들기</Button>} /><WritingStats data={data} /><div className="document-grid">{data.essays.map((essay) => <article className="document-card" key={essay.id} onClick={() => onOpen(essay)}><div className="document-card-head"><div className="document-icon tone-lilac"><FileText size={20} /></div><div className="document-actions"><Chip tone={essay.status === "완료" ? "skill" : "output"}>{stage(essay)}</Chip><IconButton label="자기소개서 삭제" className="danger-action" onClick={(event) => { event.stopPropagation(); onDelete(essay); }}><Trash2 size={15} /></IconButton></div></div><div><span className="eyebrow">{essay.company}</span><h2>{essay.role} 자기소개서</h2><p>최근 수정 {relativeTime(essay.updatedAt)}</p></div><div className="document-progress"><div><span>진행률</span><strong>{progress(essay)}%</strong></div><div className="progress-track"><span style={{ width: `${progress(essay)}%` }} /></div></div><div className="document-footer"><span>{essay.questions.length}개 문항 · {essay.questions.filter((item) => item.draft).length}개 초안</span><ChevronRight size={18} /></div></article>)}<button className="new-document-card" onClick={onNew}><Cloud size={23} fill="currentColor" /><strong>새 자기소개서</strong><span>지원 자료에서 시작</span></button></div></div>;
}

function WorkflowPage({ essay, current, expanded, setExpanded, onStep, header, children }) {
  return <div className="focus-page"><FocusHeader {...header} /><div className="focus-layout"><ProgressRail essay={essay} current={current} onStep={onStep} expanded={expanded} setExpanded={setExpanded} /><main className="workflow-main">{children}</main></div></div>;
}

function FileInput({ value, onChange, label }) {
  return <label className="compact-file-input"><UploadCloud size={16} /><span>{value || label}</span><input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(event) => onChange(event.target.files?.[0]?.name || "")} /></label>;
}

function SourceIntake({ essay, onSaveEssay, onSaveQuestion, onAddQuestion, onDeleteQuestion, onHome, onBack, onNext, expanded, setExpanded, onStep, notify }) {
  const [form, setForm] = useState({ company: essay.company, role: essay.role, sources: essay.sources });
  const [questions, setQuestions] = useState(essay.questions.map((item) => ({ id: item.id, prompt: item.prompt, charLimit: item.charLimit })));
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState("저장됨");
  const firstChange = useRef(true);
  useUnsavedWarning(saveState === "변경됨" || saveState === "저장 중...");
  useEffect(() => {
    setForm({ company: essay.company, role: essay.role, sources: essay.sources });
    setQuestions(essay.questions.map((item) => ({ id: item.id, prompt: item.prompt, charLimit: item.charLimit })));
    setSaveState("저장됨");
  }, [essay.id, essay.questions.length]);
  const setSource = (group, key, value) => {
    setForm((current) => ({ ...current, sources: { ...current.sources, [group]: { ...current.sources[group], [key]: value } } }));
    setSaveState("변경됨");
  };
  const commit = async () => {
    setSaveState("저장 중...");
    await onSaveEssay({ company: form.company, role: form.role, sources: form.sources });
    await Promise.all(questions.map((item) => onSaveQuestion(item.id, { prompt: item.prompt, charLimit: item.charLimit }, true)));
    setSaveState("저장됨");
  };
  useEffect(() => {
    if (firstChange.current) {
      firstChange.current = false;
      return undefined;
    }
    setSaveState("변경됨");
    const timer = window.setTimeout(() => commit().catch(() => setSaveState("저장 실패")), 900);
    return () => window.clearTimeout(timer);
  }, [form, questions]);
  useEffect(() => {
    const flush = () => { commit().catch(() => setSaveState("저장 실패")); };
    window.addEventListener("wishport:flush", flush);
    return () => window.removeEventListener("wishport:flush", flush);
  }, [form, questions]);
  const addQuestion = async () => { await commit(); await onAddQuestion(); };
  const deleteQuestion = async (id) => { await commit(); await onDeleteQuestion(id); };
  const next = async () => {
    setBusy(true);
    try { await commit(); notify("지원 정보와 문항 제목을 동기화했습니다."); await onNext(); } finally { setBusy(false); }
  };
  const move = async (step) => { await commit(); onStep(step); };
  return <WorkflowPage essay={essay} current="source" expanded={expanded} setExpanded={setExpanded} onStep={move} header={{ title: `${form.company || "기업명"} · ${form.role || "직무"} · 자기소개서`, status: saveState, onHome, onBack: async () => { await commit(); onBack(); }, actionLabel: "다음 단계", onAction: next, busy, actionDisabled: !form.company.trim() || !form.role.trim() || !questions.length }}><div className="workflow-heading"><span className="eyebrow">SOURCE INTAKE</span><h1>지원 자료와 문항을 입력하세요.</h1><p>기업명과 직무는 Writing House의 자기소개서 제목과 지원 현황에 함께 반영됩니다.</p></div><div className="source-stack"><SourceRow number="01" icon={Target} title="지원 정보" description="기업 · 직무"><div className="inline-inputs"><input value={form.company} placeholder="기업명" onChange={(event) => { setForm((current) => ({ ...current, company: event.target.value })); setSaveState("변경됨"); }} /><input value={form.role} placeholder="직무" onChange={(event) => { setForm((current) => ({ ...current, role: event.target.value })); setSaveState("변경됨"); }} /></div></SourceRow><SourceRow number="02" icon={Link2} title="채용 공고" description="URL · 파일"><div className="source-dual-input"><input value={form.sources.jobPost.url} placeholder="채용 공고 URL" onChange={(event) => setSource("jobPost", "url", event.target.value)} /><FileInput value={form.sources.jobPost.file} label="채용 공고 파일 첨부" onChange={(value) => setSource("jobPost", "file", value)} /></div></SourceRow><SourceRow number="03" icon={BriefcaseBusiness} title="직무기술서" description="URL · 파일"><div className="source-dual-input"><input value={form.sources.jobDescription.url} placeholder="직무기술서 URL" onChange={(event) => setSource("jobDescription", "url", event.target.value)} /><FileInput value={form.sources.jobDescription.file} label="직무기술서 파일 첨부" onChange={(value) => setSource("jobDescription", "file", value)} /></div></SourceRow><SourceRow number="04" icon={MessageSquareText} title="자기소개서 문항" description="문항 · 글자 수"><div className="question-input-list">{questions.map((question, index) => <div className="question-input-row" key={question.id}><span>Q{index + 1}</span><textarea value={question.prompt} onChange={(event) => { setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, prompt: event.target.value } : item)); setSaveState("변경됨"); }} /><label><input type="number" min="100" max="5000" step="50" value={question.charLimit} onChange={(event) => { setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, charLimit: Number(event.target.value) } : item)); setSaveState("변경됨"); }} /><span>자</span></label><IconButton label="문항 삭제" className="danger-action" onClick={() => deleteQuestion(question.id)}><Trash2 size={15} /></IconButton></div>)}<Button icon={Plus} onClick={addQuestion} disabled={questions.length >= 8}>문항 추가</Button></div></SourceRow></div></WorkflowPage>;
}

function SourceRow({ number, icon: Icon, title, description, children }) {
  return <section className="source-row"><span className="source-number">{number}</span><div className="source-label"><Icon size={18} /><div><h2>{title}</h2><p>{description}</p></div></div><div className="source-control">{children}</div></section>;
}

function RulesPanel({ essay, onSaveEssay }) {
  const [rules, setRules] = useState(essay.rules);
  const [saved, setSaved] = useState("저장됨");
  useEffect(() => { setRules(essay.rules); setSaved("저장됨"); }, [essay.id, essay.rules.blindMode, essay.rules.aiInstructions]);
  const save = async (next = rules) => { setSaved("저장 중..."); await onSaveEssay({ rules: next }); setSaved("저장됨"); };
  return <div className="design-side-panel"><div className="side-panel-heading"><div><span className="eyebrow">WRITING RULES</span><h2>작성 규칙</h2></div><span>{saved}</span></div><label className="toggle-row"><div><ShieldCheck size={18} /><span><strong>블라인드 채용 모드</strong><small>학교명, 출신지 등 식별 정보를 생성에서 제외</small></span></div><input type="checkbox" checked={rules.blindMode} onChange={(event) => { const next = { ...rules, blindMode: event.target.checked }; setRules(next); save(next); }} /></label><label className="rule-editor"><span>AI 작성 지침</span><textarea value={rules.aiInstructions} placeholder="예: 첫 문단은 짧게, 성과보다 행동을 구체적으로 작성" onChange={(event) => { setRules((current) => ({ ...current, aiInstructions: event.target.value })); setSaved("변경됨"); }} onBlur={() => save()} /></label><div className="rule-preview"><strong>적용 방식</strong><p>이 규칙은 모든 문항의 신규 생성과 다시 다듬기에 적용됩니다. 기존 초안은 자동으로 덮어쓰지 않습니다.</p></div></div>;
}

function ReferencePanel({ essay, onSaveEssay }) {
  const [reference, setReference] = useState(essay.reference);
  const [saved, setSaved] = useState("저장됨");
  useEffect(() => { setReference(essay.reference); setSaved("저장됨"); }, [essay.id, essay.reference.file, essay.reference.text]);
  const save = async (next = reference) => { setSaved("저장 중..."); await onSaveEssay({ reference: next }); setSaved("저장됨"); };
  return <div className="design-side-panel"><div className="side-panel-heading"><div><span className="eyebrow">STYLE REFERENCE</span><h2>문체 참고 자료</h2></div><span>{saved}</span></div><FileInput value={reference.file} label="기존 자기소개서 첨부" onChange={(file) => { const next = { ...reference, file }; setReference(next); save(next); }} /><label className="rule-editor"><span>참고 문장 또는 문체 설명</span><textarea value={reference.text} placeholder="내가 작성한 문장이나 유지하고 싶은 문체 특징을 입력하세요." onChange={(event) => { setReference((current) => ({ ...current, text: event.target.value })); setSaved("변경됨"); }} onBlur={() => save()} /></label><div className="rule-preview"><strong>사용 범위</strong><p>참고 자료는 말투와 문장 길이에만 사용하며, 경험 사실과 성과는 Archive 근거만 사용합니다.</p></div></div>;
}

function EssayDesign({ essay, experiences, onSelectQuestion, onSetContext, onSaveEssay, onHome, onBack, onNext, expanded, setExpanded, onStep, busy }) {
  const [tab, setTab] = useState("archive");
  const activeQuestion = essay.questions[essay.activeQuestion] || essay.questions[0];
  const selectedIds = activeQuestion?.selectedExperienceIds || [];
  const selected = selectedIds.map((id) => experiences.find((item) => item.id === id)).filter(Boolean);
  const setContext = (ids) => onSetContext(activeQuestion.id, ids);
  const addExperience = (item) => { if (!selectedIds.includes(item.id)) setContext([...selectedIds, item.id]); };
  const onDrop = (event) => {
    event.preventDefault();
    const item = experiences.find((experience) => experience.id === event.dataTransfer.getData("experience"));
    if (item) addExperience(item);
  };
  return <WorkflowPage essay={essay} current="design" expanded={expanded} setExpanded={setExpanded} onStep={onStep} header={{ title: `${essay.company} · ${essay.role} · 자기소개서`, status: `Q${essay.activeQuestion + 1} · ${selected.length}개 경험`, onHome, onBack, actionLabel: "다음 단계", onAction: onNext, busy, actionDisabled: !selected.length }}><div className="essay-design-grid"><section className="question-board"><div className="board-heading"><div><span className="eyebrow">QUESTION BOARD</span><h1>문항마다 근거와 작성 조건을 설계하세요.</h1></div><span>{essay.questions.length} questions</span></div><div className="question-list">{essay.questions.map((question, index) => <article className={cn("question-card", essay.activeQuestion === index && "active")} key={question.id}><button className="question-card-toggle" onClick={() => onSelectQuestion(index)}><div className="question-number">Q{index + 1}</div><div className="question-content"><h2>{question.prompt}</h2><div className="question-meta"><span>{question.charLimit}자</span><span>{question.selectedExperienceIds.length}개 경험</span>{question.needsRegeneration && <span className="changed-label">설계 변경됨</span>}</div></div><ChevronDown size={18} /></button>{essay.activeQuestion === index && <div className="context-drop" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><span>Q{index + 1}에 연결된 경험</span><div className="selected-contexts">{selected.length ? selected.map((item) => <div className="selected-experience" key={item.id}><GripVertical size={14} /><strong>{item.title}</strong><div className="chip-row">{item.chips.slice(0, 2).map(([label, tone]) => <Chip tone={tone} key={`${tone}-${label}`}>{label}</Chip>)}</div><IconButton label="이 문항에서 제거" onClick={() => setContext(selectedIds.filter((id) => id !== item.id))}><X size={14} /></IconButton></div>) : <div className="context-empty"><Plus size={17} />Archive 탭에서 이 문항의 경험을 추가하세요.</div>}</div></div>}</article>)}</div></section><aside className="context-panel"><div className="context-tabs"><button className={tab === "archive" ? "active" : ""} onClick={() => setTab("archive")}>Archive</button><button className={tab === "rules" ? "active" : ""} onClick={() => setTab("rules")}>Rules</button><button className={tab === "reference" ? "active" : ""} onClick={() => setTab("reference")}>Reference</button></div>{tab === "archive" && <><div className="context-panel-head"><div><span className="eyebrow">CONNECTED ARCHIVE</span><h2>경험 라이브러리</h2></div><Search size={17} /></div><div className="library-list">{experiences.map((experience, index) => <article className="library-card" key={experience.id} draggable onDragStart={(event) => event.dataTransfer.setData("experience", experience.id)}><div className="library-card-head"><div><span>{Math.max(72, 96 - index * 4)}%</span><h3>{experience.title}</h3></div><GripVertical size={17} /></div><p>{experience.summary}</p><div className="chip-row">{experience.chips.slice(0, 3).map(([label, tone]) => <Chip tone={tone} key={`${tone}-${label}`}>{label}</Chip>)}</div><Button onClick={() => addExperience(experience)} disabled={selectedIds.includes(experience.id)} icon={selectedIds.includes(experience.id) ? Check : Plus}>{selectedIds.includes(experience.id) ? "이 문항에 선택됨" : `Q${essay.activeQuestion + 1}에 추가`}</Button></article>)}</div></>}{tab === "rules" && <RulesPanel essay={essay} onSaveEssay={onSaveEssay} />}{tab === "reference" && <ReferencePanel essay={essay} onSaveEssay={onSaveEssay} />}</aside></div></WorkflowPage>;
}

function getSelectionDetails(editor) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !editor.contains(selection.anchorNode)) return null;
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
  return { start, end, sentenceStart, sentenceEnd, selectedText, sentenceRaw, sentence: sentenceRaw.trim() };
}

const feedbackTypes = [
  { id: "verbose", label: "장황한 표현", description: "핵심 행동만 남겨 간결하게", tone: "lemon" },
  { id: "ai", label: "AI 같은 표현", description: "상투적인 표현을 자연스럽게", tone: "lilac" },
  { id: "unnecessary", label: "불필요한 서술", description: "문장에서 제거해도 되는 내용", tone: "rose" },
  { id: "vague", label: "모호한 표현", description: "행동과 결과를 근거로 구체화", tone: "sky" },
  { id: "keep", label: "유지할 표현", description: "좋은 문장으로 표시하고 유지", tone: "mint" },
];

function feedbackType(id) {
  return feedbackTypes.find((item) => item.id === id) || feedbackTypes[0];
}

function questionSummary(question, index) {
  if (question.theme && question.theme !== "직접 입력") return question.theme.replace(" · 문제해결", "과정");
  if (question.prompt.includes("지원") || question.prompt.includes("입사")) return "지원동기";
  if (question.prompt.includes("협업") || question.prompt.includes("팀")) return "협업과정";
  if (question.prompt.includes("역량") || question.prompt.includes("직무")) return "직무역량";
  return `문항 ${index + 1}`;
}

function suggestSentence(sentence, category, evidence) {
  const clean = sentence.replace(/\s+/g, " ").trim();
  if (category === "unnecessary") return "";
  if (category === "keep") return clean;
  if (category === "verbose") return clean
    .replace(/저는 /g, "").replace(/또한,?\s*/g, "").replace(/이를 통해\s*/g, "")
    .replace(/할 수 있었습니다/g, "했습니다").replace(/하게 되었습니다/g, "했습니다");
  if (category === "ai") return clean
    .replace(/단순히 ([^,.]+)에 그치지 않고,?\s*/g, "$1하고 ")
    .replace(/이를 통해/g, "그 결과").replace(/기여하겠습니다/g, "실행하겠습니다")
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
  const storedRanges = annotations.filter((item) => !item.archived && item.start >= 0 && item.end > item.start && item.end <= draft.length && draft.slice(item.start, item.end) === item.highlightText);
  const ranges = [...storedRanges, ...(selection ? [{ ...selection, id: "current-selection", category: "selection" }] : [])]
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter((item, index, list) => index === 0 || item.start >= list[index - 1].end);
  const content = [];
  let cursor = 0;
  ranges.forEach((range) => {
    if (range.start > cursor) content.push(<span key={`text-${cursor}`}>{draft.slice(cursor, range.start)}</span>);
    const type = range.category === "selection" ? null : feedbackType(range.category);
    content.push(<mark key={range.id} className={cn("feedback-highlight", type && `tone-${type.tone}`, range.category === "selection" && "is-selection", range.status && `is-${range.status}`)} title={type?.label}>{draft.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  });
  if (cursor < draft.length) content.push(<span key={`text-${cursor}`}>{draft.slice(cursor)}</span>);
  return <div ref={editorRef} className="rich-draft-editor selectable-draft" role="textbox" aria-label="자기소개서 초안" tabIndex={0} onMouseUp={() => onSelect(getSelectionDetails(editorRef.current))}>{content.length ? content : draft}</div>;
}

function StarEvidence({ experience }) {
  const star = experience.star || blankStar;
  return <div className="star-evidence"><div className="star-evidence-head"><strong>{experience.title}</strong><span>STAR</span></div>{[["S", "Situation", star.situation || experience.evidence], ["T", "Task", star.task], ["A", "Action", star.action || experience.evidence], ["R", "Result", star.result]].map(([letter, label, value]) => <div className="star-evidence-row" key={letter}><b>{letter}</b><div><span>{label}</span><p>{value || "Archive에서 근거를 추가해 주세요."}</p></div></div>)}</div>;
}

function WritingFeedback({ essay, experiences, apiConfig, onSelectQuestion, onSaveQuestion, onGenerate, onHome, onBack, onComplete, expanded, setExpanded, onStep, busy }) {
  const question = essay.questions[essay.activeQuestion] || essay.questions[0];
  const [draft, setDraft] = useState(question.draft);
  const [feedback, setFeedback] = useState(question.feedback || "내 말투처럼 더 담백하게, 첫 문단은 짧게");
  const [annotations, setAnnotations] = useState(question.annotations || []);
  const [saveState, setSaveState] = useState("저장됨");
  const [selection, setSelection] = useState(null);
  const selected = question.selectedExperienceIds.map((id) => experiences.find((item) => item.id === id)).filter(Boolean);
  useUnsavedWarning(saveState === "변경됨" || saveState === "저장 중...");
  useEffect(() => {
    setDraft(question.draft);
    setFeedback(question.feedback || "내 말투처럼 더 담백하게, 첫 문단은 짧게");
    setAnnotations(question.annotations || []);
    setSelection(null);
    setSaveState("저장됨");
  }, [question.id, question.updatedAt]);
  const commit = async (silent = false, nextDraft = draft, nextAnnotations = annotations, nextFeedback = feedback) => {
    setSaveState("저장 중...");
    await onSaveQuestion(question.id, { draft: nextDraft, feedback: nextFeedback, annotations: nextAnnotations }, silent);
    setSaveState("저장됨");
  };
  useEffect(() => {
    const flush = () => { commit(true).catch(() => setSaveState("저장 실패")); };
    window.addEventListener("wishport:flush", flush);
    return () => window.removeEventListener("wishport:flush", flush);
  }, [draft, feedback, annotations, question.id]);
  const addFeedback = async (category) => {
    if (!selection) return;
    const suggestion = suggestSentence(selection.sentence, category, selected[0]);
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
    const next = annotations.map((item) => item.id === id ? { ...item, status: "kept" } : item);
    setAnnotations(next);
    await commit(true, draft, next);
  };
  const acceptFeedback = async (id) => {
    const item = annotations.find((annotation) => annotation.id === id);
    if (!item) return;
    const raw = draft.slice(item.sentenceStart, item.sentenceEnd);
    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    const replacement = item.suggestion ? `${leading}${item.suggestion}${trailing}` : (raw.includes("\n") ? "\n" : " ");
    const nextDraft = draft.slice(0, item.sentenceStart) + replacement + draft.slice(item.sentenceEnd);
    const delta = replacement.length - (item.sentenceEnd - item.sentenceStart);
    const highlightStart = item.sentenceStart + (item.suggestion ? leading.length : 0);
    const next = annotations.map((annotation) => {
      if (annotation.id === id) return { ...annotation, status: "accepted", archived: !item.suggestion, start: highlightStart, end: highlightStart + item.suggestion.length, highlightText: item.suggestion };
      if (annotation.end <= item.sentenceStart) return annotation;
      if (annotation.start >= item.sentenceEnd) return { ...annotation, start: annotation.start + delta, end: annotation.end + delta, sentenceStart: annotation.sentenceStart + delta, sentenceEnd: annotation.sentenceEnd + delta };
      return { ...annotation, archived: true };
    });
    setDraft(nextDraft);
    setAnnotations(next);
    await commit(true, nextDraft, next);
  };
  const changeQuestion = async (index) => { await commit(true); await onSelectQuestion(index); };
  const revise = async () => { await commit(true); await onGenerate(question.id, draft ? "revise" : "generate", feedback); };
  const move = async (step) => { await commit(true); onStep(step); };
  return <WorkflowPage essay={essay} current="editor" expanded={expanded} setExpanded={setExpanded} onStep={move} header={{ title: `${essay.company} · ${essay.role} · 자기소개서`, status: saveState, onHome, onBack: async () => { await commit(true); onBack(); }, actionLabel: "작성 완료", onAction: async () => { await commit(true); onComplete(); }, finalAction: true, cloudAction: true, busy }}>
    <div className="question-tabs">{essay.questions.map((item, index) => <button key={item.id} className={essay.activeQuestion === index ? "active" : ""} onClick={() => changeQuestion(index)}><span>Q{index + 1}</span><b>{questionSummary(item, index)}</b><strong>{item.draft ? `${item.draft.length}자` : "초안 없음"}</strong>{item.needsRegeneration && <i />}</button>)}</div>
    <div className="writing-layout"><section className="answer-editor"><div className="answer-head"><div><span className="eyebrow">QUESTION {String(essay.activeQuestion + 1).padStart(2, "0")}</span><h1>{question.prompt}</h1><p>{question.charLimit}자 · 현재 {draft.length}자</p></div><div className="version-chip">{question.needsRegeneration ? "설계 변경됨" : "DB 저장"}</div></div>
      {question.needsRegeneration && <div className="change-notice"><AlertCircle size={16} /><span>경험 연결이나 문항이 바뀌었습니다. 기존 초안은 유지되며 다시 다듬을 때 새 설계가 반영됩니다.</span></div>}
      {draft ? <><div className="selection-guide"><Highlighter size={15} /><span>수정할 부분을 드래그한 뒤 피드백 유형을 선택하세요. 문장 전체를 비교하고 반영 여부를 결정할 수 있습니다.</span></div><DraftEditor draft={draft} annotations={annotations} selection={selection} onSelect={setSelection} />
        {selection && <div className="feedback-picker"><div className="feedback-picker-head"><div><span className="eyebrow">SELECTED TEXT</span><strong>{selection.selectedText}</strong></div><IconButton label="선택 취소" onClick={() => setSelection(null)}><X size={16} /></IconButton></div><div className="feedback-type-grid">{feedbackTypes.map((type) => <button className={`tone-${type.tone}`} key={type.id} onClick={() => addFeedback(type.id)}><span>{type.label}</span><small>{type.description}</small></button>)}</div></div>}
        {!!annotations.length && <div className="feedback-review-list"><div className="review-heading"><span className="eyebrow">SENTENCE REVIEW</span><h2>문장별 수정 제안</h2></div>{annotations.slice().reverse().map((item) => { const type = feedbackType(item.category); return <article className={cn("feedback-review-card", `tone-${type.tone}`, `status-${item.status}`)} key={item.id}><div className="review-card-head"><span>{type.label}</span><b>{item.status === "accepted" ? "제안 반영" : item.status === "kept" ? "원문 유지" : "검토 대기"}</b></div><div className="sentence-compare"><div><small>기존 문장</small><p>{item.originalSentence}</p></div><ArrowRight size={17} /><div><small>수정 제안</small><p>{item.suggestion || "이 문장 삭제"}</p></div></div>{item.status === "pending" && <div className="review-actions"><Button onClick={() => keepFeedback(item.id)}>원문 유지</Button><Button variant="primary" icon={Check} onClick={() => acceptFeedback(item.id)}>제안으로 교체</Button></div>}</article>; })}</div>}
      </> : <div className="draft-empty"><Sparkles size={25} /><h2>아직 이 문항의 초안이 없습니다.</h2><p>연결된 {selected.length}개 경험을 근거로 소제목과 STAR 서술형 초안을 만드세요.</p><Button variant="primary" icon={busy ? LoaderCircle : Sparkles} className={busy ? "is-loading" : ""} onClick={revise} disabled={busy || !selected.length}>이 문항 초안 생성</Button></div>}
      <div className="protected-note"><Check size={15} /><span>문장 피드백, 처리 상태와 문항별 초안은 서로 독립적으로 DB에 저장됩니다.</span></div></section>
      <aside className="feedback-panel"><div className="panel-section"><span className="eyebrow">STAR GROUNDING</span><h2>Q{essay.activeQuestion + 1}에 사용한 근거</h2><div className="grounding-list">{selected.length ? selected.map((item) => <StarEvidence key={item.id} experience={item} />) : <p className="muted-copy">문항 설계에서 경험을 연결해 주세요.</p>}</div></div><div className="panel-section"><span className="eyebrow">REVISION NOTE</span><h2>AI 수정 지침</h2><textarea value={feedback} onChange={(event) => { setFeedback(event.target.value); setSaveState("변경됨"); }} onBlur={() => commit(true)} /><div className="feedback-toolbar">{[["담백하게", "내 말투처럼 더 담백하게 바꿔줘"], ["구체적으로", "추상적인 표현을 줄이고 행동을 구체화해줘"], ["간결하게", "문장을 더 짧고 간결하게 줄여줘"]].map(([label, note]) => <button key={label} className={feedback === note ? "active" : ""} onClick={() => { setFeedback(note); commit(true, draft, annotations, note); }}>{label}</button>)}</div><Button variant="primary" icon={busy ? LoaderCircle : RefreshCw} className={busy ? "is-loading" : ""} onClick={revise} disabled={busy || !selected.length}>{draft ? "이 문항 다시 다듬기" : "이 문항 초안 생성"}</Button><small>{apiConfig.llmEnabled ? `${apiConfig.model} 연결됨` : "데모 AI 응답 사용 중"}</small></div></aside></div>
  </WorkflowPage>;
}

function ApplicationDialog({ onClose, onSave, busy }) {
  const [form, setForm] = useState({ company: "", role: "", status: "지원 예정", submittedAt: "" });
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal-panel modal-small" onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="modal-head"><div><span className="eyebrow">APPLICATION</span><h2>지원 추가</h2></div><IconButton type="button" label="닫기" onClick={onClose}><X size={18} /></IconButton></div><div className="modal-body"><div className="form-grid"><Field label="기업명" value={form.company} required onChange={(value) => setForm((current) => ({ ...current, company: value }))} /><Field label="직무" value={form.role} onChange={(value) => setForm((current) => ({ ...current, role: value }))} /><label className="field-group"><span>상태</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label><Field label="제출일" type="date" value={form.submittedAt} onChange={(value) => setForm((current) => ({ ...current, submittedAt: value }))} /></div></div><div className="modal-actions"><Button type="button" onClick={onClose}>취소</Button><Button type="submit" variant="primary" icon={busy ? LoaderCircle : Cloud} className={cn("cloud-primary", busy && "is-loading")} disabled={busy || !form.company.trim()}>추가</Button></div></form></div>;
}

function EmptyState({ title }) {
  return <div className="empty-state"><Cloud size={24} /><strong>{title}</strong></div>;
}

function Tracking({ applications, essays, onAdd, onUpdate, onDelete, notify }) {
  const [filter, setFilter] = useState("전체");
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const visible = filter === "전체" ? applications : applications.filter((row) => row.status === filter);
  const add = async (payload) => { setBusy(true); try { await onAdd(payload); setDialog(false); } finally { setBusy(false); } };
  const updateStatus = async (row, status) => { await onUpdate(row.id, { status }); notify(`지원 상태를 '${status}'로 변경했습니다.`); };
  return <div className="content-page">
    <PageHeading eyebrow="APPLICATION PIPELINE" title="State Tracking" description="지원 상태와 DB에 연결된 자기소개서를 한눈에 확인합니다." actions={<Button variant="primary" className="cloud-primary" icon={Cloud} onClick={() => setDialog(true)}>지원 추가</Button>} />
    <div className="status-tabs">{["전체", ...statusOptions].map((status) => <button className={filter === status ? "active" : ""} key={status} onClick={() => setFilter(status)}><span>{status}</span><strong>{status === "전체" ? applications.length : applications.filter((row) => row.status === status).length}</strong></button>)}</div>
    <div className="table-wrap"><table className="tracking-table"><thead><tr><th>기업</th><th>직무</th><th>제출일</th><th>상태</th><th>연결된 자소서</th><th>최근 업데이트</th><th /></tr></thead><tbody>{visible.map((row) => { const essay = essays.find((item) => item.id === row.essayId); return <tr key={row.id}><td><strong>{row.company}</strong></td><td>{row.role}</td><td>{row.submittedAt || "미제출"}</td><td><select value={row.status} onChange={(event) => updateStatus(row, event.target.value)}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></td><td>{essay ? `${essay.role} 자기소개서 · ${essay.status}` : "연결된 자소서 없음"}</td><td>{relativeTime(row.updatedAt)}</td><td><IconButton label="지원 삭제" className="danger-action table-action" onClick={() => window.confirm("지원 항목을 삭제할까요?") && onDelete(row.id)}><Trash2 size={15} /></IconButton></td></tr>; })}</tbody></table>{!visible.length && <EmptyState title="이 상태의 지원 항목이 없습니다." />}</div>
    {dialog && <ApplicationDialog onClose={() => setDialog(false)} onSave={add} busy={busy} />}
  </div>;
}

export default function App() {
  const [config, setConfig] = useState({ googleClientId: "", llmEnabled: false, model: "gpt-5-mini", demoAuthEnabled: true });
  const [user, setUser] = useState(undefined);
  const [data, setData] = useState(blankData);
  const [loadingData, setLoadingData] = useState(false);
  const [page, setPage] = useState("archive");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeEssayId, setActiveEssayId] = useState("");
  const [archiveExperienceId, setArchiveExperienceId] = useState("");
  const [expanded, setExpanded] = useState("source");
  const [toast, setToast] = useState("");
  const [generating, setGenerating] = useState(false);
  const toastTimer = useRef();

  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }, []);
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoadingData(true);
    try {
      const next = await api("/api/bootstrap");
      setData(next);
      setActiveEssayId((current) => current && next.essays.some((essay) => essay.id === current) ? current : next.essays[0]?.id || "");
      return next;
    } catch (error) {
      if (error.message === "로그인이 필요합니다.") setUser(null);
      else notify(error.message);
      return null;
    } finally {
      if (!silent) setLoadingData(false);
    }
  }, [notify]);
  useEffect(() => {
    Promise.all([api("/api/config"), api("/api/session")]).then(([nextConfig, session]) => { setConfig(nextConfig); setUser(session.user || null); }).catch(() => setUser(null));
  }, []);
  useEffect(() => { if (user) loadData(); }, [user, loadData]);
  useEffect(() => {
    if (!user) return undefined;
    window.history.replaceState({ page: "archive" }, "", "#archive");
    const onPopState = (event) => {
      window.dispatchEvent(new Event("wishport:flush"));
      setPage(event.state?.page || "archive");
      if (event.state?.essayId) setActiveEssayId(event.state.essayId);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [user]);
  const navigate = useCallback((nextPage, essayId = activeEssayId, replace = false) => {
    setPage(nextPage);
    setExpanded(nextPage);
    window.history[replace ? "replaceState" : "pushState"]({ page: nextPage, essayId }, "", `#${nextPage}`);
  }, [activeEssayId]);
  const mutate = useCallback(async (path, method, payload, message, silent = false) => {
    const body = await api(path, { method, body: payload === undefined ? undefined : JSON.stringify(payload) });
    await loadData(true);
    if (message && !silent) notify(message);
    return body;
  }, [loadData, notify]);

  const activeEssay = data.essays.find((essay) => essay.id === activeEssayId) || data.essays[0];
  const saveEssay = (patch, silent = true) => mutate(`/api/essays/${activeEssay.id}`, "PATCH", patch, silent ? "" : "자기소개서를 저장했습니다.", silent);
  const saveQuestion = (id, patch, silent = false) => mutate(`/api/questions/${id}`, "PATCH", patch, silent ? "" : "문항을 저장했습니다.", silent);
  const selectQuestion = async (index) => {
    if (activeEssay.activeQuestion !== index) await mutate(`/api/essays/${activeEssay.id}`, "PATCH", { activeQuestion: index }, "", true);
  };
  const startEssay = async () => {
    try {
      const body = await api("/api/essays", { method: "POST", body: JSON.stringify({ company: "새 지원", role: "직무 미정" }) });
      setActiveEssayId(body.essay.id);
      await loadData(true);
      navigate("source", body.essay.id);
      notify("새 자기소개서를 만들었습니다.");
    } catch (error) { notify(error.message); }
  };
  const openEssay = (essay) => {
    setActiveEssayId(essay.id);
    navigate(workflowSteps[Math.min(essay.currentStep, 2)].id, essay.id);
  };
  const workflowNavigate = async (step) => {
    const index = workflowSteps.findIndex((item) => item.id === step);
    if (index < 0 || index > activeEssay.maxStep || step === "complete") return;
    await mutate(`/api/essays/${activeEssay.id}`, "PATCH", { currentStep: index }, "", true);
    navigate(step, activeEssay.id);
  };
  const advance = async (nextPage) => {
    const index = workflowSteps.findIndex((item) => item.id === nextPage);
    await mutate(`/api/essays/${activeEssay.id}`, "PATCH", { currentStep: index, maxStep: index }, "", true);
    navigate(nextPage, activeEssay.id);
  };
  const generate = async (questionId, mode, feedback = "") => {
    setGenerating(true);
    try {
      const body = await api("/api/llm/essay", { method: "POST", body: JSON.stringify({ questionId, mode, feedback }) });
      await mutate(`/api/essays/${activeEssay.id}`, "PATCH", { currentStep: 2, maxStep: 2 }, "", true);
      navigate("editor", activeEssay.id);
      notify(body.demo ? "데모 AI가 문항 초안을 저장했습니다." : "선택한 근거로 문항 초안을 저장했습니다.");
    } catch (error) { notify(error.message); } finally { setGenerating(false); }
  };
  const completeEssay = async () => {
    await mutate(`/api/essays/${activeEssay.id}`, "PATCH", { status: "완료", currentStep: 2, maxStep: 3 }, "자기소개서 작성을 완료했습니다.");
    navigate("writing");
  };
  const logout = async () => { await api("/api/logout", { method: "POST" }); setUser(null); setData(blankData); setPage("archive"); };
  const saveExperience = async (payload, id) => {
    const body = await mutate(id ? `/api/experiences/${id}` : "/api/experiences", id ? "PATCH" : "POST", payload, id ? "경험을 수정했습니다." : "새 경험을 저장했습니다.");
    return body.experience;
  };
  const createItem = async (payload) => (await mutate("/api/archive-items", "POST", payload, "항목을 추가했습니다.")).item;
  const updateItem = async (id, payload) => (await mutate(`/api/archive-items/${id}`, "PATCH", payload, "항목을 저장했습니다.")).item;
  const appPage = useMemo(() => ["archive", "writing", "tracking"].includes(page) ? page : "writing", [page]);

  if (user === undefined) return <div className="app-loading"><Cloud size={28} fill="currentColor" /><span>Wish Port</span></div>;
  if (!user) return <><Landing config={config} onSignedIn={setUser} notify={notify} />{toast && <div className="toast">{toast}</div>}</>;
  if (loadingData || !data.profile) return <div className="app-loading"><LoaderCircle className="is-loading" size={26} /><span>Archive를 불러오는 중입니다.</span></div>;

  let content;
  if (page === "archive") content = <ArchiveOverview data={data} onEdit={() => navigate("archive-edit")} />;
  if (page === "archive-edit") content = <ArchiveEditor data={data} initialExperienceId={archiveExperienceId} onBack={() => { setArchiveExperienceId(""); navigate("archive"); }} onSaveProfile={(profile) => mutate("/api/profile", "PATCH", profile, "기본정보를 저장했습니다.")} onSaveExperience={saveExperience} onDeleteExperience={(id) => mutate(`/api/experiences/${id}`, "DELETE", undefined, "경험을 삭제하고 문항 연결도 정리했습니다.")} onCreateItem={createItem} onUpdateItem={updateItem} onDeleteItem={(id) => mutate(`/api/archive-items/${id}`, "DELETE", undefined, "항목을 삭제했습니다.")} notify={notify} />;
  if (page === "writing") content = <WritingHouse data={data} onNew={startEssay} onOpen={openEssay} onDelete={(essay) => window.confirm(`'${essay.company}' 자기소개서를 삭제할까요?`) && mutate(`/api/essays/${essay.id}`, "DELETE", undefined, "자기소개서를 삭제했습니다.")} />;
  if (activeEssay && page === "source") content = <SourceIntake essay={activeEssay} onSaveEssay={saveEssay} onSaveQuestion={saveQuestion} onAddQuestion={() => mutate(`/api/essays/${activeEssay.id}/questions`, "POST", { prompt: "새 자기소개서 문항", charLimit: 600 }, "문항을 추가했습니다.")} onDeleteQuestion={(id) => window.confirm("이 문항과 작성된 초안을 삭제할까요?") && mutate(`/api/questions/${id}`, "DELETE", undefined, "문항을 삭제했습니다.")} onHome={() => navigate("writing")} onBack={() => navigate("writing")} onNext={() => advance("design")} expanded={expanded} setExpanded={setExpanded} onStep={workflowNavigate} notify={notify} />;
  if (activeEssay && page === "design") content = <EssayDesign essay={activeEssay} experiences={data.experiences} onSelectQuestion={selectQuestion} onSetContext={(questionId, experienceIds) => mutate(`/api/questions/${questionId}/context`, "PUT", { experienceIds }, "문항의 경험 연결을 저장했습니다.")} onSaveEssay={saveEssay} onHome={() => navigate("writing")} onBack={() => workflowNavigate("source")} onNext={() => advance("editor")} expanded={expanded} setExpanded={setExpanded} onStep={workflowNavigate} busy={generating} />;
  if (activeEssay && page === "editor") content = <WritingFeedback essay={activeEssay} experiences={data.experiences} apiConfig={config} onSelectQuestion={selectQuestion} onSaveQuestion={saveQuestion} onGenerate={generate} onHome={() => navigate("writing")} onBack={() => workflowNavigate("design")} onComplete={completeEssay} expanded={expanded} setExpanded={setExpanded} onStep={workflowNavigate} busy={generating} />;
  if (page === "tracking") content = <Tracking applications={data.applications} essays={data.essays} onAdd={(payload) => mutate("/api/applications", "POST", payload, "지원 항목을 추가했습니다.")} onUpdate={(id, payload) => mutate(`/api/applications/${id}`, "PATCH", payload, "", true)} onDelete={(id) => mutate(`/api/applications/${id}`, "DELETE", undefined, "지원 항목을 삭제했습니다.")} notify={notify} />;
  if (!content) content = <div className="content-page"><EmptyState title="화면을 불러오지 못했습니다." /></div>;
  const focused = ["archive-edit", "source", "design", "editor"].includes(page);
  return <div className="app-shell">{!focused && <AppHeader page={appPage} onNavigate={navigate} user={user} onLogout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />}{content}{toast && <div className="toast">{toast}</div>}</div>;
}
