export default function ContentPage({ header, children, toast }) {
  return <div className="app-shell">{header}{children}{toast && <div className="toast">{toast}</div>}</div>;
}
