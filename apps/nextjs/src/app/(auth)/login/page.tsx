"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const login = trpc.auth.login.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (err) => {
      if (err.message === "email_not_verified") {
        setError("Ihre E-Mail-Adresse wurde noch nicht verifiziert.");
        setShowResend(true);
      } else {
        setError(err.message);
        setShowResend(false);
      }
    },
  });

  const resend = trpc.auth.resendVerification.useMutation({
    onSuccess: () => {
      setError("Verifizierungslink wurde erneut gesendet.");
      setShowResend(false);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    setResendEmail(email);
    login.mutate({
      email,
      password: formData.get("password") as string,
      rememberMe,
    });
  }

  return (
    <AuthShell
      footer={
        <span>
          Noch kein Konto?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Registrieren
          </Link>
        </span>
      }
    >
      <div className="mb-8 space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
          Willkommen zurück
        </h1>
        <p className="text-muted-foreground">
          Melden Sie sich mit Ihrer E-Mail und Ihrem Passwort an.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            {showResend && (
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => resend.mutate({ email: resendEmail })}
                disabled={resend.isPending}
              >
                Erneut senden
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@beispiel.de"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
            minLength={10}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="rememberMe"
            className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
          >
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            Angemeldet bleiben
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Passwort vergessen?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-auto px-10"
          disabled={login.isPending}
        >
          {login.isPending ? "Wird angemeldet..." : "Anmelden"}
        </Button>
      </form>
    </AuthShell>
  );
}
