"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwoerter stimmen nicht ueberein.");
      return;
    }

    if (!token) return;

    resetPassword.mutate({
      token,
      password,
    });
  }

  const loginFooter = (
    <span>
      <Link
        href="/login"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Zurück zur Anmeldung
      </Link>
    </span>
  );

  if (!token) {
    return (
      <AuthShell
        footer={
          <Link
            href="/forgot-password"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Neuen Link anfordern
          </Link>
        }
      >
        <div className="mb-8 space-y-3">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
            Ungültiger Link
          </h1>
          <p className="text-muted-foreground">
            Dieser Link zum Zurücksetzen des Passworts ist ungültig.
          </p>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell footer={loginFooter}>
        <div className="mb-8 space-y-3">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
            Passwort zurückgesetzt
          </h1>
          <p className="text-muted-foreground">
            Ihr Passwort wurde erfolgreich zurückgesetzt. Sie werden zur
            Anmeldung weitergeleitet...
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell footer={loginFooter}>
      <div className="mb-8 space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
          Neues Passwort setzen
        </h1>
        <p className="text-muted-foreground">
          Geben Sie Ihr neues Passwort ein. Mindestens 10 Zeichen, 1
          Großbuchstabe, 1 Zahl und 1 Sonderzeichen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Neues Passwort</Label>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="new-password"
            minLength={10}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            required
            autoComplete="new-password"
            minLength={10}
          />
        </div>

        <Button
          type="submit"
          className="w-auto px-10"
          disabled={resetPassword.isPending}
        >
          {resetPassword.isPending
            ? "Wird zurückgesetzt..."
            : "Passwort zurücksetzen"}
        </Button>
      </form>
    </AuthShell>
  );
}
