'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ImagePlus, Plus, Sparkles } from 'lucide-react';

const tabs=['기본사항','경험','성과·자격','Assets'];
type Experience={title:string;meta:string;summary:string};
const seedExperiences:Experience[]=[
  {title:'Erooming',meta:'PM · Frontend',summary:'역할과 우선순위를 재조정해 일정 안에 프로젝트를 완성했습니다.'},
  {title:'Local GPT',meta:'AI · Product Design',summary:'검색과 생성의 역할을 다시 정의해 프로젝트 방향을 재설계했습니다.'},
  {title:'인도네시아 수요예측',meta:'Data · Machine Learning',summary:'수요 패턴을 분석해 비즈니스 인사이트로 연결했습니다.'},
];

export function ArchiveEditor(){
  const [tab,setTab]=useState('기본사항'); const [mobile,setMobile]=useState<'preview'|'edit'>('edit'); const [save,setSave]=useState('불러오는 중…');
  const [profile,setProfile]=useState({name:'천그루',role:'Product · AI · Frontend',email:'groo@example.com',phone:'010-0000-0000',intro:'사람의 경험을 구조화하고, 기술이 더 정확한 맥락을 이해하도록 만드는 일을 좋아합니다.'});
  const [experiences,setExperiences]=useState<Experience[]>(seedExperiences); const [draft,setDraft]=useState<Experience|null>(null); const [selected,setSelected]=useState<number|null>(null);
  const [extras,setExtras]=useState<Record<string,string[]>>({'성과·자격':[],'Assets':[]}); const [extraDraft,setExtraDraft]=useState('');
  const [ready,setReady]=useState(false); const [photo,setPhoto]=useState(''); const [uploading,setUploading]=useState(false); const fileInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{fetch('/api/archive').then(r=>r.json()).then(data=>{if(data.profile)setProfile(current=>({...current,...data.profile}));if(Array.isArray(data.experiences)&&data.experiences.length)setExperiences(data.experiences);if(data.extras)setExtras(current=>({...current,...data.extras}));setSave('저장됨');setReady(true);}).catch(()=>{setSave('데모로 편집 중');setReady(true);});},[]);
  useEffect(()=>{if(!ready)return;const timer=window.setTimeout(async()=>{try{const response=await fetch('/api/archive',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({profile,experiences,extras})});if(!response.ok)throw new Error();setSave('저장됨');}catch{setSave('저장되지 않음 · 다시 시도');}},700);return()=>window.clearTimeout(timer);},[profile,experiences,extras,ready]);
  function update(key:keyof typeof profile,value:string){setSave('저장 중…');setProfile(current=>({...current,[key]:value}));}
  async function uploadPhoto(file?:File){if(!file)return;setUploading(true);setPhoto(URL.createObjectURL(file));const form=new FormData();form.append('file',file);try{const response=await fetch('/api/files',{method:'POST',body:form});if(!response.ok)throw new Error();setSave('사진 업로드됨');}catch{setSave('사진은 미리보기로 적용됨');}finally{setUploading(false);}}
  function addExperience(){if(!draft?.title.trim())return;setExperiences(current=>[...current,{...draft,title:draft.title.trim(),meta:draft.meta||'Project',summary:draft.summary||'새 경험의 행동과 결과를 정리해보세요.'}]);setDraft(null);setSave('저장 중…');}
  function addExtra(){if(!extraDraft.trim())return;setExtras(current=>({...current,[tab]:[...(current[tab]||[]),extraDraft.trim()]}));setExtraDraft('');setSave('저장 중…');}
  return <main className="archive-editor-screen">
    <header className="archive-editor-header"><div><a href="/"><ArrowLeft/> Archive Overview</a><span className="editor-title-stack"><strong>Career Archive</strong><small>{save}</small></span></div><div className="live-label"><b>LIVE ARCHIVE EDITOR</b><span>오른쪽에서 바꾸면 왼쪽 Resume에 바로 반영됩니다.</span></div><a href="/" className="finish-cloud">편집 완료</a></header>
    <div className="archive-mobile-switch"><button className={mobile==='preview'?'active':''} onClick={()=>setMobile('preview')}>미리보기</button><button className={mobile==='edit'?'active':''} onClick={()=>setMobile('edit')}>편집</button></div>
    <div className="archive-editor-grid" data-mobile={mobile}>
      <aside className="live-resume-pane"><div className="pane-caption"><span>PRINT RESUME</span><b>LIVE</b></div><article className="mini-resume">
        <header><div className="mini-photo">{photo?<img src={photo} alt="업로드한 증명사진"/>:'PHOTO'}</div><div><span>{profile.role}</span><h1>{profile.name||'이름'}</h1><p>{profile.intro}</p><small>{profile.email} · {profile.phone}</small></div></header>
        <section><h2>EDUCATION</h2><div><b>한동대학교</b><span>2022 — 2026</span></div><p>ICT융합전공 · 전자공학 · GPA 3.8 / 4.5</p></section>
        <section><h2>EXPERIENCE</h2>{experiences.slice(0,3).map((item,index)=><div className="mini-experience" key={`${item.title}-${index}`}><div><b>{item.title}</b><span>{item.meta}</span></div><p>{item.summary}</p></div>)}</section>
      </article></aside>
      <section className="archive-form-pane">
        <div className="completion-card"><div><span>아카이브 완성도</span><strong>72%</strong></div><div className="completion-track"><i/></div><p><Check/> 기본정보 완료 · 활용 가능한 경험 6개</p></div>
        <nav className="archive-tabs">{tabs.map(item=><button className={tab===item?'active':''} onClick={()=>setTab(item)} key={item}>{item}{item==='기본사항'&&<Check/>}</button>)}</nav>
        {tab==='기본사항'&&<div className="form-content"><header><div><h1>기본사항</h1><p>Resume 상단에 표시되는 핵심 정보만 관리합니다.</p></div><span className="status-sticker mint">필수정보 완료</span></header>
          <section className="builder-card"><div className="builder-card-head"><span>01</span><div><strong>프로필</strong><p>이름과 희망 직무를 입력하세요.</p></div></div><div className="form-grid"><label><span>이름</span><input value={profile.name} onChange={e=>update('name',e.target.value)}/></label><label><span>희망 직무 / 소개</span><input value={profile.role} onChange={e=>update('role',e.target.value)}/></label></div><label><span>한 줄 소개</span><textarea value={profile.intro} onChange={e=>update('intro',e.target.value)}/></label></section>
          <section className="builder-card"><div className="builder-card-head"><span className="lilac">02</span><div><strong>연락처</strong><p>로그인 이메일과 별개로 Resume에 표시할 연락처입니다.</p></div></div><div className="form-grid"><label><span>연락 이메일</span><input value={profile.email} onChange={e=>update('email',e.target.value)}/></label><label><span>전화번호</span><input value={profile.phone} onChange={e=>update('phone',e.target.value)}/></label></div></section>
          <section className="builder-card"><div className="builder-card-head"><span className="peach">03</span><div><strong>증명사진</strong><p>Standard Resume처럼 왼쪽 상단에 배치됩니다.</p></div></div><input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png" onChange={e=>uploadPhoto(e.target.files?.[0])}/><button className="upload-button" onClick={()=>fileInput.current?.click()} disabled={uploading}><ImagePlus/> {uploading?'업로드 중…':'사진 업로드'} <small>JPG · PNG · 세로형 권장</small></button></section>
        </div>}
        {tab==='경험'&&<div className="form-content"><header><div><h1>경험</h1><p>원본과 AI가 정리한 Career Object를 분리해 관리합니다.</p></div><button className="soft-action" onClick={()=>{setDraft({title:'',meta:'',summary:''});setSelected(null);}}><Plus/> 프로젝트 추가</button></header>
          {draft&&<section className="builder-card add-form-card"><div className="builder-card-head"><span className="lilac">NEW</span><div><strong>새 프로젝트</strong><p>이력서에 표시할 최소 정보부터 입력하세요.</p></div></div><label><span>프로젝트명</span><input autoFocus value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="예: Wish Port"/></label><div className="form-grid"><label><span>역할 · 분야</span><input value={draft.meta} onChange={e=>setDraft({...draft,meta:e.target.value})} placeholder="PM · Frontend"/></label><label><span>핵심 행동과 결과</span><input value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})} placeholder="무엇을 바꾸고 어떤 결과를 냈나요?"/></label></div><div className="inline-actions"><button onClick={()=>setDraft(null)}>취소</button><button className="v6-primary" onClick={addExperience}>프로젝트 저장</button></div></section>}
          {experiences.map((item,i)=><div key={`${item.title}-${i}`}><button className={`entity-row ${selected===i?'selected':''}`} onClick={()=>setSelected(selected===i?null:i)}><span className="entity-index">{String(i+1).padStart(2,'0')}</span><span><strong>{item.title}</strong><small>{item.meta}</small></span><span className="status-sticker lilac"><Sparkles/> AI 분석 완료</span><b>›</b></button>{selected===i&&<section className="builder-card entity-detail"><div><strong>Career Object</strong><p>{item.summary}</p></div><button className="soft-action" onClick={()=>setExperiences(current=>current.filter((_,index)=>index!==i))}>목록에서 제거</button></section>}</div>)}
        </div>}
        {(tab==='성과·자격'||tab==='Assets')&&<div className="form-content"><header><div><h1>{tab}</h1><p>자소서와 Resume에서 반복해서 사용할 정보를 관리합니다.</p></div><button className="soft-action" onClick={()=>setExtraDraft('')}><Plus/> 추가</button></header><section className="builder-card"><div className="builder-card-head"><span className={tab==='Assets'?'lilac':''}>NEW</span><div><strong>{tab==='Assets'?'스킬·링크·포트폴리오':'자격·수상·성과'} 추가</strong><p>항목 하나씩 가볍게 등록할 수 있어요.</p></div></div><div className="inline-add"><input value={extraDraft} onChange={e=>setExtraDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addExtra();}} placeholder={tab==='Assets'?'예: GitHub · github.com/...':'예: 정보처리기사 · 준비 중'}/><button className="v6-primary" onClick={addExtra}>저장</button></div>{(extras[tab]||[]).length>0&&<div className="extra-list">{extras[tab].map((item,i)=><span key={`${item}-${i}`}>{item}<button onClick={()=>setExtras(current=>({...current,[tab]:current[tab].filter((_,index)=>index!==i)}))}>×</button></span>)}</div>}</section>{(extras[tab]||[]).length===0&&<section className="builder-card empty-builder"><Sparkles/><strong>정리할 항목을 추가해보세요.</strong><p>위 입력창에 내용을 쓰고 저장을 누르면 바로 목록에 반영됩니다.</p></section>}</div>}
      </section>
    </div>
  </main>;
}
