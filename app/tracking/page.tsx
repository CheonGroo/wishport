'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/wishport/app-header';

const initialRows = [
  { company:'한국전력거래소', role:'IT', due:'2026.09.08', status:'지원 예정', document:'V2 · 피드백 중', updated:'12분 전' },
  { company:'Data Nest', role:'Data Analyst', due:'2026.09.03', status:'제출', document:'V4 · 제출본', updated:'어제' },
  { company:'Sample Corp.', role:'AI 서비스 기획', due:'2026.08.28', status:'서류합격', document:'V3 · 완료', updated:'2일 전' },
  { company:'Design Lab', role:'UX Engineer', due:'2026.08.18', status:'면접', document:'V2 · 완료', updated:'3일 전' },
  { company:'Future Systems', role:'Frontend Engineer', due:'2026.08.10', status:'최종합격', document:'V5 · 제출본', updated:'9일 전' },
];
const filters=['전체','지원 예정','제출','서류합격','면접','최종합격','불합격'];

export default function TrackingPage(){
  const [rows,setRows]=useState(initialRows); const [filter,setFilter]=useState('전체'); const [asc,setAsc]=useState(true); const [ready,setReady]=useState(false);
  useEffect(()=>{fetch('/api/applications').then(r=>r.json()).then(data=>{if(Array.isArray(data.rows)&&data.rows.length)setRows(data.rows);setReady(true);}).catch(()=>setReady(true));},[]);
  useEffect(()=>{if(!ready)return;const timer=window.setTimeout(()=>{fetch('/api/applications',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({rows})}).catch(()=>{});},500);return()=>window.clearTimeout(timer);},[rows,ready]);
  const visible=useMemo(()=>rows.filter(r=>filter==='전체'||r.status===filter).sort((a,b)=>(asc?1:-1)*a.company.localeCompare(b.company,'ko')),[rows,filter,asc]);
  return <main className="wish-app"><AppHeader active="tracking" saveState="지원 상태 자동 저장"/><section className="workspace-page v6-page tracking-page">
    <header className="page-intro v6-page-head"><div><h1>State Tracking</h1><p>지원 상태와 중요한 일정을 한 눈에 확인합니다. 각 컬럼의 삼각형으로 바로 정렬할 수 있어요.</p></div></header>
    <div className="tracking-filters">{filters.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}<b>{item==='전체'?rows.length:rows.filter(r=>r.status===item).length}</b></button>)}</div>
    <div className="tracking-table-wrap"><table className="tracking-table"><thead><tr><th><button onClick={()=>setAsc(v=>!v)}>기업 <span className="sort-pair">{asc?'▲':'▼'}</span></button></th><th>직무</th><th>제출일</th><th>상태</th><th>연결된 자소서</th><th>최근 업데이트</th></tr></thead><tbody>{visible.map(row=><tr key={row.company}><td><strong>{row.company}</strong></td><td>{row.role}</td><td>{row.due}</td><td><select value={row.status} onChange={e=>setRows(current=>current.map(x=>x.company===row.company?{...x,status:e.target.value}:x))}>{filters.slice(1).map(x=><option key={x}>{x}</option>)}</select></td><td><a href="/writing/editor" className="document-link">{row.document}</a></td><td>{row.updated}</td></tr>)}</tbody></table></div>
  </section></main>;
}
