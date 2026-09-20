"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/admin-client";

export function PasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (next !== confirm) {
      setErrors({ confirm: "The two new passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/password", { body: { current, next } });
      toast.push("Password changed.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details ?? {});
        toast.push(err.message, "error");
      } else {
        toast.push("Could not change the password.", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Current password" htmlFor="pw-current" required error={errors.current} className="sm:col-span-2">
        <Input
          id="pw-current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </Field>
      <Field label="New password" htmlFor="pw-next" required error={errors.next} hint="At least 10 characters, with a number.">
        <Input
          id="pw-next"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </Field>
      <Field label="Confirm new password" htmlFor="pw-confirm" required error={errors.confirm}>
        <Input
          id="pw-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy || !current || !next}>
          {busy ? "Saving…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
