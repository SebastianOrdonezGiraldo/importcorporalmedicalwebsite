"use client";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="adm-form">
      <label className="adm-field">
        <span>Contraseña</span>
        <input type="password" name="password" required autoFocus autoComplete="current-password" />
      </label>
      {state?.error && <p className="adm-alert err" role="alert">{state.error}</p>}
      <button className="btn btn-violet" type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
