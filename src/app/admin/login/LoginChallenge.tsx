"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
  reset(id: string): void;
};
type ChallengeWindow = Window & { turnstile?: TurnstileApi };

export default function LoginChallenge({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "verified" | "error">("loading");

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setStatus("error"), 15000);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    const api = (window as ChallengeWindow).turnstile;
    if (!ready || !api || !container.current) return;
    let active = true;
    const invalidate = (next: "loading" | "error") => {
      if (active) { onToken(""); setStatus(next); }
    };
    try {
      widget.current = api.render(container.current, {
        sitekey: siteKey, action: "admin_login", language: "es", theme: "light", size: "flexible",
        "response-field": false, "refresh-expired": "auto",
        callback: (token: string) => { if (active) { onToken(token); setStatus("verified"); } },
        "expired-callback": () => invalidate("loading"),
        "timeout-callback": () => invalidate("error"),
        "error-callback": () => { invalidate("error"); return true; },
      });
    } catch { invalidate("error"); }
    return () => {
      active = false;
      if (widget.current !== null) api.remove(widget.current);
      widget.current = null;
    };
  }, [ready, siteKey, onToken]);

  function retry() {
    const api = (window as ChallengeWindow).turnstile;
    if (!api || widget.current === null) { window.location.reload(); return; }
    onToken(""); setStatus("loading"); api.reset(widget.current);
  }

  return (
    <div className="adm-challenge">
      <Script id="admin-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive" onReady={() => setReady(true)} onError={() => { onToken(""); setStatus("error"); }} />
      <div ref={container} />
      <p role="status" aria-live="polite">
        {status === "verified" ? "Verificación completada." : status === "error" ? "No se pudo completar la verificación. Comprueba tu conexión e inténtalo de nuevo." : "Completando la verificación de seguridad…"}
      </p>
      {status === "error" && <button type="button" className="adm-challenge-retry" onClick={retry}>Reintentar verificación</button>}
      <noscript>Activa JavaScript para completar la verificación y entrar al panel.</noscript>
    </div>
  );
}
