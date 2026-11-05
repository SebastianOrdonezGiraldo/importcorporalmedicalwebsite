"use client";
import { useActionState, useState } from "react";
import { login, type FormState } from "../actions";
import LoginChallenge from "./LoginChallenge";

export default function LoginForm({ siteKey }: { siteKey: string }) {
  const [token, setToken] = useState("");
  const [challengeAttempt, setChallengeAttempt] = useState(0);
  const [state, action, pending] = useActionState(async (previous: FormState, data: FormData) => {
    try { return await login(previous, data); }
    finally {
      setToken("");
      setChallengeAttempt((attempt) => attempt + 1);
    }
  }, undefined);
  return (
    <form action={action} className="adm-form">
      <label className="adm-field">
        <span>Contraseña</span>
        <input type="password" name="password" required autoFocus autoComplete="current-password" />
      </label>
      {siteKey && <LoginChallenge key={challengeAttempt} siteKey={siteKey} onToken={setToken} />}
      <input type="hidden" name="cf-turnstile-response" value={token} />
      {state?.error && <p className="adm-alert err" role="alert">{state.error}</p>}
      <button className="btn btn-violet" type="submit" disabled={pending || (!!siteKey && !token)}>{pending ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
