'use client';

import { useEffect, useRef, useState } from 'react';
import { Archive, Check, Copy, Heart, ListChecks, RotateCcw, Scissors, ShieldCheck, Sparkles, Target, ThumbsDown, X } from 'lucide-react';

type Toolbar = { left:number; top:number } | null;
type AnswerProps = { num:string; question:string; initial:string; sources:string[] };

const feedback = [
  ['good','마음에 들어요',Heart], ['dislike','싫어요',ThumbsDown], ['ai','AI 같아요',Sparkles],
  ['voice','내 말투 아님',RotateCcw], ['verbose','장황해요',Scissors], ['keep','유지',ShieldCheck],
] as const;

function AnswerCard({num,question,initial,sources}:AnswerProps){
  const editor=useRef<HTMLDivElement>(null); const savedRange=useRef<Range|null>(null);
  const [toolbar,setToolbar]=useState<Toolbar>(null); const [grounding,setGrounding]=useState(false); const [suggestion,setSuggestion]=useState(''); const [busy,setBusy]=useState(false); const [count,setCount]=useState(initial.length);
  useEffect(()=>{ if(editor.current && !editor.current.innerHTML) editor.current.textContent=initial; },[initial]);
  function selectText(){ const selection=window.getSelection(); if(!selection||selection.isCollapsed||!selection.rangeCount||!editor.current?.contains(selection.anchorNode)){setToolbar(null);return;} const range=selection.getRangeAt(0); const rect=range.getBoundingClientRect(); savedRange.current=range.cloneRange(); setToolbar({left:Math.min(window.innerWidth-520,Math.max(12,rect.left)),top:Math.max(78,rect.top-50)}); }
  function mark(type:string){ const range=savedRange.current;if(!range||range.collapsed)return;const span=document.createElement('span');span.className=`feedback-mark mark-${type}`;try{range.surroundContents(span);}catch{return;}window.getSelection()?.removeAllRanges();setToolbar(null);savedRange.current=null; }
  async function regenerate(){ setBusy(true); try{ const response=await fetch('/api/ai/regenerate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({answer:editor.current?.innerText||initial,question,protectedText:[...editor.current?.querySelectorAll('.mark-keep')||[]].map(x=>x.textContent)})}); const data=await response.json(); setSuggestion(data.suggestion); }catch{ setSuggestion('구체적인 행동과 확인 가능한 결과가 더 선명하게 드러나도록 문장을 정리했습니다.'); }finally{setBusy(false);} }
  function applySuggestion(){ if(!editor.current)return; const kept=[...editor.current.querySelectorAll('.mark-keep')].map(x=>x.outerHTML).join(' '); editor.current.innerHTML=`${suggestion} ${kept}`; setCount(editor.current.innerText.length); setSuggestion(''); }
  return <article className="answer-card-v6">
    <header className="answer-head-v6"><div><div className="question-number">{num}</div><h2>{question}</h2></div><div className="answer-actions-v6"><span className="word-count">{count} / 800</span><button onClick={regenerate} disabled={busy}><RotateCcw />{busy?'정리 중…':'문항 재생성'}</button></div></header>
    <div className="answer-body-v6"><div ref={editor} className="answer-text-v6" contentEditable suppressContentEditableWarning onMouseUp={selectText} onKeyUp={selectText} onInput={e=>setCount(e.currentTarget.innerText.length)} spellCheck={false}/>
      <footer className="answer-footer-v6"><div className="grounding-wrap-v6"><button onClick={()=>setGrounding(v=>!v)}><ShieldCheck /> 근거 {sources.length}</button>{grounding&&<div className="grounding-pop-v6"><h3>Archive 근거</h3>{sources.map(source=><p key={source}>{source}</p>)}<span><Check /> Archive에 연결된 사실만 사용했어요.</span></div>}</div><p>직접 수정하거나 ⭐ 유지한 문장은 다음 재생성에서 보호됩니다.</p></footer>
      {suggestion&&<section className="regen-panel-v6"><div className="regen-title-v6"><strong>현재 문장과 새 제안을 비교하세요.</strong><span>보호 문장 유지</span></div><div className="diff-v6"><del>기존 표현 일부</del><ins>{suggestion}</ins></div><div className="regen-actions-v6"><button onClick={()=>setSuggestion('')}>기존 유지</button><button className="apply" onClick={applySuggestion}>새 제안 적용</button></div></section>}
    </div>
    {toolbar&&<div className="feedback-toolbar-v6" style={{left:toolbar.left,top:toolbar.top}}>{feedback.map(([type,label,Icon])=><button key={type} onMouseDown={e=>e.preventDefault()} onClick={()=>mark(type)}><Icon />{label}</button>)}</div>}
  </article>;
}

export function WritingEditor(){
  const [saved,setSaved]=useState('저장됨'); const [notice,setNotice]=useState(''); const [sideTab,setSideTab]=useState<'feedback'|'goals'|'archive'|null>('feedback');
  async function copyAll(){const text=[...document.querySelectorAll<HTMLElement>('.answer-text-v6')].map((node,index)=>`${index+1}. ${node.innerText}`).join('\n\n');try{await navigator.clipboard.writeText(text);setNotice('자소서 전체를 클립보드에 복사했어요.');}catch{setNotice('복사하지 못했어요. 문장을 직접 선택해 주세요.');}}
  function saveEssay(){setSaved('저장 중…');window.clearTimeout((window as Window & {__essaySave?:number}).__essaySave);(window as Window & {__essaySave?:number}).__essaySave=window.setTimeout(async()=>{const answers=[...document.querySelectorAll<HTMLElement>('.answer-text-v6')].map(node=>node.innerText);try{const response=await fetch('/api/essays/current',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({company:'한국전력거래소',role:'IT',answers,version:2})});if(!response.ok)throw new Error();setSaved('저장됨');}catch{setSaved('로컬 수정됨');}},650);}
  return <main className="editor-screen-v6" onInput={saveEssay}>
    <header className="editor-header-v6"><div className="editor-left-v6"><a href="/writing">← Writing House</a><div><strong>한국전력거래소 · IT</strong><span>3 / 3 · 문장 편집 · {saved}</span></div></div><div className="editor-center-v6"><strong>자기소개서 피드백</strong><span>텍스트를 선택하면 피드백 도구가 열려요.</span></div><div className="editor-right-v6"><span className="version-pill">V2</span><button onClick={copyAll}><Copy/>전체 복사</button><button className="finish-cloud" onClick={()=>setNotice('완성본 V3를 저장했어요. Tracking에서 이어서 관리할 수 있어요.')}>편집 완료</button></div></header>
    <section className="editor-intro-v6"><div><h1>문장 단위로 다듬어볼까요?</h1><p>직접 수정한 문장과 ⭐ 유지 문장은 다음 재생성에서 보호됩니다.</p></div><div className="feedback-guide-v6"><span className="mark-ai">🤖 AI 같아요</span><span className="mark-verbose">✂️ 장황해요</span><span className="mark-keep">⭐ 유지</span></div></section>
    <aside className="editor-side-note-v6"><strong>데모에서 확인할 수 있는 것</strong> 보라색 하이라이트는 “AI 같아요”, 노란색은 “장황해요”, 초록색은 “유지” 피드백입니다. 문장을 직접 드래그한 뒤 떠오르는 도구바에서 새로운 피드백도 추가해보세요.</aside>
    <section className="answers-column">
      <AnswerCard num="01 · 800자" question="최신 트렌드나 변화하는 시장 요구를 파악하고 자신만의 인사이트를 도출했던 경험을 작성해 주세요." initial="인도네시아 시장의 판매 데이터를 분석하며 단순한 예측 정확도보다 수요 변화의 원인을 설명하는 일이 더 중요하다는 점을 발견했습니다. 먼저 제품군과 시기별 판매 패턴을 나누어 반복되는 변화를 확인하고, 프로모션과 계절성이 수요에 미치는 영향을 가설로 정리했습니다. 그 결과 모델의 수치를 실제 운영 의사결정에 활용할 수 있는 비즈니스 인사이트로 전환했습니다." sources={['인도네시아 수요예측 · 수요 패턴 분석','EDA · 비즈니스 인사이트 도출','Data Analysis · Machine Learning']}/>
      <AnswerCard num="02 · 800자" question="팀의 목표 달성을 위해 수행을 잘 하지 못하는 구성원을 도와 협업했던 경험을 작성해 주세요." initial="Erooming 프로젝트에서 일정이 지연되었을 때 개인의 문제로 단정하지 않고 먼저 막힌 업무와 각자의 작업량을 확인했습니다. 이후 역할을 다시 나누고 완료 기준을 작은 단위로 정리해 매일 진행 상황을 공유했습니다. 팀원은 맡은 범위를 명확히 이해하고 다시 작업에 참여할 수 있었으며, 팀은 계획한 일정 안에 서비스를 완성했습니다." sources={['Erooming · 역할 재배분','일정 내 프로젝트 완료','협업 · 프로젝트 관리']}/>
      <AnswerCard num="03 · 800자" question="본인의 역할을 성실히 수행하여 구성원들이 본인을 신뢰할 수 있도록 했던 경험을 작성해 주세요." initial="프로젝트의 진행 상황과 완료 기준을 꾸준히 공유해 팀원이 제 역할의 상태를 언제든 예측할 수 있도록 했습니다. 문제가 생겼을 때는 결과만 알리지 않고 원인과 다음 행동을 함께 전달했습니다. 이러한 반복이 쌓이며 일정과 우선순위를 맡길 수 있다는 신뢰를 얻었고, 마지막까지 팀의 실행 흐름을 안정적으로 유지했습니다." sources={['Erooming · 일정 및 태스크 점검','진행 상황 공유','책임감 · 커뮤니케이션']}/>
    </section>
    <aside className={`grammar-side ${sideTab?'open':''}`} aria-label="Writing assistant">
      <nav className="grammar-rail" aria-label="도움말 탭">
        <button className={sideTab==='feedback'?'active':''} onClick={()=>setSideTab(sideTab==='feedback'?null:'feedback')} aria-label="피드백"><ListChecks/><span>4</span></button>
        <button className={sideTab==='goals'?'active':''} onClick={()=>setSideTab(sideTab==='goals'?null:'goals')} aria-label="작성 목표"><Target/></button>
        <button className={sideTab==='archive'?'active':''} onClick={()=>setSideTab(sideTab==='archive'?null:'archive')} aria-label="Archive 근거"><Archive/></button>
      </nav>
      {sideTab&&<section className="grammar-panel"><header><div><span>WISH PORT ASSISTANT</span><h2>{sideTab==='feedback'?'문장 피드백':sideTab==='goals'?'작성 목표':'Archive 근거'}</h2></div><button onClick={()=>setSideTab(null)} aria-label="사이드 패널 닫기"><X/></button></header>
        {sideTab==='feedback'&&<div className="assistant-list"><article className="assistant-card lilac"><span>AI 같아요 · 1</span><strong>추상적인 표현을 행동으로 바꿔보세요.</strong><p>“시너지를 극대화했습니다” 대신 실제로 조정한 업무를 적으면 더 자연스러워요.</p><button onClick={()=>document.querySelector<HTMLElement>('.mark-ai')?.scrollIntoView({behavior:'smooth',block:'center'})}>문장으로 이동</button></article><article className="assistant-card lemon"><span>장황해요 · 1</span><strong>핵심 결과를 앞쪽으로 옮길 수 있어요.</strong><p>첫 두 문장을 합치면 인사이트가 더 빠르게 보입니다.</p></article><article className="assistant-card mint"><span>보호 중 · 1</span><strong>내 말투로 유지할 문장</strong><p>다음 재생성에서도 이 문장은 그대로 유지됩니다.</p></article></div>}
        {sideTab==='goals'&&<div className="assistant-list"><article className="assistant-card"><span>지원 기업</span><strong>한국전력거래소 · IT</strong><p>운영 관점 · 문제 해결 · 협업 신뢰를 중심으로 작성합니다.</p></article><div className="goal-row"><span>문체</span><b>명확하고 담백하게</b></div><div className="goal-row"><span>분량</span><b>문항당 800자</b></div><div className="goal-row"><span>블라인드</span><b>학교·지역 제외</b></div></div>}
        {sideTab==='archive'&&<div className="assistant-list"><article className="assistant-card sky"><span>연결된 경험 · 3</span><strong>Erooming</strong><p>역할 재배분 · 일정 내 완료 · 협업</p><button onClick={()=>setNotice('Erooming 근거를 현재 문항에 연결했어요.')}>현재 문항에 연결</button></article><article className="assistant-card"><strong>인도네시아 수요예측</strong><p>수요 패턴 분석 · 비즈니스 인사이트</p></article><article className="assistant-card"><strong>Local GPT</strong><p>문제 재정의 · 검색 품질 개선</p></article></div>}
      </section>}
    </aside>
    {notice&&<button className="app-toast" onClick={()=>setNotice('')} aria-live="polite">{notice}<span>닫기</span></button>}
  </main>;
}
