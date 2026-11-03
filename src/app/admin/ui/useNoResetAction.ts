"use client";
import { startTransition, useActionState, type FormEvent } from "react";
import type { FormState } from "../actions";

/**
 * useActionState, but submitting via onSubmit so React does not clear the form
 * when the server answers with a validation error.
 */
export function useNoResetAction(action: (s: FormState, fd: FormData) => Promise<FormState>) {
  const [state, run, pending] = useActionState(action, undefined);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => run(fd));
  };
  return { state, pending, onSubmit };
}
