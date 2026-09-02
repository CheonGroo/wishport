import { AppHeader } from '@/components/wishport/app-header';

export default function WritingHouse() {
  return <main className="wish-app">
    <AppHeader active="writing" />
    <section className="workspace-page v6-page">
      <header className="page-intro v6-page-head"><div><h1>Writing House</h1><p>현재 작성 중인 자기소개서와 최근 문서를 모아봅니다.</p></div><a href="/writing/new" className="v6-primary">+ 자기소개서 만들기</a></header>
      <div className="writing-grid v6-essay-grid">
        <a href="/writing/editor" className="essay-file v6-essay-card"><div><div className="file-top"><div><h2>한국전력거래소 · IT</h2><p>최근 수정 12분 전</p></div><span className="status-sticker lilac">피드백 중</span></div><div className="file-progress"><span style={{width:'78%'}} /></div></div><footer>3개 문항 · V2 · 피드백 4개</footer></a>
        <a href="/writing/editor" className="essay-file v6-essay-card"><div><div className="file-top"><div><h2>AI 서비스 기획 · Sample</h2><p>어제 수정</p></div><span className="status-sticker mint">작성 중</span></div><div className="file-progress"><span style={{width:'82%'}} /></div></div><footer>4개 문항 · V3</footer></a>
        <a href="/writing/new" className="essay-file v6-essay-card v6-empty-card"><span>＋</span><div><strong>새 자기소개서 만들기</strong><p>공고와 직무기술서에서 시작해요.</p></div></a>
      </div>
    </section>
  </main>;
}
