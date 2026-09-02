'use client';

import { useEffect, useState } from 'react';
import { Download, Edit3, FileText, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/wishport/app-header';

const experiences = [
  {
    title: 'Erooming', meta: 'PM · Frontend · Team Project', date: '2025.03 — 2025.06',
    summary: '회의실 예약 서비스를 기획하고, 일정 지연 상황에서 팀 역할과 우선순위를 재조정해 계획한 일정 안에 프로젝트를 완성했습니다.',
    chips: [['일정 지연 대응', 'material'], ['일정 내 완료', 'result'], ['협업', 'skill'], ['Web Service', 'output']],
  },
  {
    title: 'Local GPT', meta: 'AI Research · Product Design', date: '2024.09 — 2024.12',
    summary: '기업 내부 문서 기반 로컬 LLM을 실험하며 초기 접근의 한계를 발견하고, 검색과 생성의 역할을 다시 정의해 프로젝트 방향을 재설계했습니다.',
    chips: [['문제 재정의', 'material'], ['검색 품질 개선', 'result'], ['LLM', 'skill'], ['Prototype', 'output']],
  },
  {
    title: '인도네시아 수요예측', meta: 'Data Analysis · Machine Learning', date: '2024.03 — 2024.06',
    summary: '판매 데이터의 반복 패턴을 분석하고 수요 변화의 원인을 가설로 정리해, 모델 결과를 실제 비즈니스 인사이트와 연결했습니다.',
    chips: [['수요 패턴 분석', 'material'], ['인사이트 도출', 'result'], ['데이터 분석', 'skill']],
  },
];

export default function Home() {
  const [profile,setProfile]=useState({name:'천그루',role:'Product · AI · Frontend',email:'groo@example.com',phone:'010-0000-0000',intro:'사람의 경험을 구조화하고, 기술이 더 정확한 맥락을 이해하도록 만드는 일을 좋아합니다.'});
  const [archiveExperiences,setArchiveExperiences]=useState(experiences);
  const [notice,setNotice]=useState('');
  useEffect(()=>{fetch('/api/archive').then(r=>r.json()).then(data=>{if(data.profile)setProfile(current=>({...current,...data.profile}));if(Array.isArray(data.experiences)&&data.experiences.length)setArchiveExperiences(data.experiences.map((item:{title:string;meta:string;summary:string},index:number)=>({title:item.title,meta:item.meta,date:index===0?'2025 — NOW':'2024 — 2025',summary:item.summary,chips:[['Career Object','material'],['Archive 연결','result'],['경험','skill']]})));}).catch(()=>{});},[]);
  function exportArchive(){
    const blob=new Blob([JSON.stringify({profile,experiences:archiveExperiences},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const anchor=document.createElement('a'); anchor.href=url; anchor.download='wishport-career-archive.json'; anchor.click(); URL.revokeObjectURL(url);
    setNotice('Career Archive를 JSON 파일로 내보냈어요.');
  }
  function printResume(){setNotice('인쇄 창에서 PDF로 저장할 수 있어요.');window.setTimeout(()=>window.print(),120);}
  return (
    <main className="wish-app">
      <AppHeader active="archive" />

      <section className="archive-toolbar">
        <div><div className="eyebrow">CAREER ARCHIVE</div><h1>현재의 나를 한 장에 모았어요.</h1><p>입력 폼이 아니라, 언제든 꺼내 쓰고 인쇄할 수 있는 나의 Resume입니다.</p></div>
        <div className="toolbar-actions">
          <Button variant="outline" size="lg" onClick={exportArchive}><Download /> 내보내기</Button>
          <Button variant="outline" size="lg" onClick={printResume}><FileText /> PDF 미리보기</Button>
          <a className="cloud-link" href="/archive/edit"><Edit3 /> Archive 편집</a>
        </div>
      </section>

      <div className="archive-summary" aria-label="아카이브 요약">
        <div><strong>6</strong><span>활용 가능한 경험</span></div><div><strong>27</strong><span>정리된 소재</span></div><div><strong>14</strong><span>대표 역량</span></div>
        <div className="next-note"><Sparkles /><span><b>다음 추천</b> 작은 경험 하나를 더 정리해보세요.</span></div>
      </div>

      <section className="resume-stage">
        <article className="resume-paper" aria-label="천그루 이력서">
          <header className="resume-identity">
            <div className="resume-photo" aria-label="증명사진 영역"><span>PHOTO</span><small>3 × 4</small></div>
            <div className="identity-copy">
              <p className="resume-kicker">{profile.role}</p><h2>{profile.name}</h2>
              <p className="resume-intro">{profile.intro}</p>
              <div className="contact-line"><span>{profile.email}</span><span>{profile.phone}</span><span>Seoul, Korea</span></div>
            </div>
          </header>
          <section className="resume-section"><h3>Education</h3><div className="resume-row compact"><div><strong>한동대학교</strong><p>ICT융합전공 · 전자공학</p></div><div className="resume-right"><span>2022.03 — 2026.02</span><p>GPA 3.8 / 4.5</p></div></div></section>
          <section className="resume-section"><h3>Selected Experience</h3><div className="experience-list">
            {archiveExperiences.map((experience) => <article className="resume-experience" key={experience.title}>
              <div className="resume-row"><div><strong>{experience.title}</strong><p className="experience-meta">{experience.meta}</p></div><span className="resume-date">{experience.date}</span></div>
              <p className="experience-summary">{experience.summary}</p><div className="semantic-chips">{experience.chips.map(([label, tone]) => <span className={`semantic-chip ${tone}`} key={label}>{label}</span>)}</div>
            </article>)}
          </div></section>
          <div className="resume-bottom-grid"><section className="resume-section compact-section"><h3>Skills</h3><p className="skill-copy">Product Management · React · LLM · UX Research · Data Analysis</p></section><section className="resume-section compact-section"><h3>Assets</h3><p className="skill-copy">Portfolio · GitHub · Research Notes</p></section></div>
          <footer className="resume-footer"><span>Wish Port Career Archive</span><span>Updated Sep 1, 2026</span></footer>
        </article>
      </section>
      <footer className="app-footer"><span>내 데이터는 언제든 내보낼 수 있어요.</span><button onClick={()=>{window.location.href='/api/auth/logout';}}><LogOut size={14} /> 로그아웃</button></footer>
      {notice&&<button className="app-toast" onClick={()=>setNotice('')} aria-live="polite">{notice}<span>닫기</span></button>}
    </main>
  );
}
