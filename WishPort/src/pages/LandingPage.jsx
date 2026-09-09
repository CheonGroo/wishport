import { useEffect, useRef, useState } from "react";
import { ArrowRight, CircleUserRound, Cloud, LoaderCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function LandingPage({ config, onSignedIn, notify }) {
  const googleRef = useRef(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!config.googleClientId || supabase) return;
    const setup = () => {
      if (!window.google?.accounts?.id || !googleRef.current) return;
      window.google.accounts.id.initialize({ client_id: config.googleClientId, callback: async ({ credential }) => {
        setLoading(true);
        try {
          const response = await fetch("/api/auth/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }) });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || "로그인에 실패했습니다.");
          onSignedIn(body.user);
        } catch (error) { notify(error.message); } finally { setLoading(false); }
      } });
      window.google.accounts.id.renderButton(googleRef.current, { theme: "outline", size: "large", width: 320, text: "continue_with", locale: "ko" });
    };
    const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.onload = setup; document.head.appendChild(script);
    return () => script.remove();
  }, [config.googleClientId, notify, onSignedIn]);
  const login = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (error) {
        const providerDisabled = /unsupported provider|provider is not enabled/i.test(error.message || "");
        notify(providerDisabled ? "Supabase에서 Google 로그인을 활성화해 주세요. Authentication → Providers → Google" : error.message);
      }
      return;
    }
    const response = await fetch("/api/auth/demo", { method: "POST" });
    const body = await response.json();
    onSignedIn(body.user);
  };
  return <main className="landing-page"><div className="cloud-mark cloud-one"><Cloud /></div><div className="cloud-mark cloud-two"><Cloud /></div><section className="landing-content"><div className="landing-kicker"><Cloud size={17} fill="currentColor" /> Career Context Workspace</div><h1>Wish Port</h1><p>흩어진 경험을 한 번 정리하고,<br />필요한 순간에 다시 꺼내 쓰세요.</p><div className="landing-flow">{["ARCHIVE", "SELECT", "WRITE", "REFINE", "TRACK"].map((item, index) => <span key={item}>{item}{index < 4 && <ArrowRight size={12} />}</span>)}</div><div className="login-area">{config.googleClientId && !supabase && <div ref={googleRef} className="google-slot" />}{(config.demoAuthEnabled || supabase) && <button className="button button-default" onClick={login} disabled={loading}>{loading ? <LoaderCircle className="is-loading" size={16} /> : <CircleUserRound size={16} />}<span>구글 계정으로 계속하기</span></button>}</div><small>Archive가 기억하고, AI가 해석하고, 사용자가 선택합니다.</small></section></main>;
}
