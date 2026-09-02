const items = [
  ['archive', '/', 'Archive'],
  ['writing', '/writing', 'Writing House'],
  ['tracking', '/tracking', 'State Tracking'],
] as const;

export function AppHeader({ active, saveState }: { active: string; saveState?: string }) {
  return (
    <header className={`app-header ${active==='archive'?'overview-header':'service-header-v6'}`}>
      <div className="header-left-v6"><a href="/" className="brand-lockup"><span className="brand-name">Wish Port</span></a><nav className="global-nav" aria-label="주요 메뉴">{items.map(([key, href, label]) => <a key={key} className={`nav-item ${active === key ? 'active' : ''}`} href={href}>{label}</a>)}</nav></div>
      <div className="account-area"><span className="save-copy">{saveState ?? '모든 변경사항 저장됨'}</span><a href="/signin" className="profile-button" aria-label="계정 메뉴">G</a></div>
    </header>
  );
}
