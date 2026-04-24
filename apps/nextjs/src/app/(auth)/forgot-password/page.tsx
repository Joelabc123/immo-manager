"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const forgotPassword = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    forgotPassword.mutate({
      email: formData.get("email") as string,
    });
  }

  const footer = (
    <span>
      <Link
        href="/login"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Zurück zur Anmeldung
      </Link>
    </span>
  );

  if (submitted) {
    return (
      <AuthShell footer={footer}>
        <div className="mb-8 space-y-3">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
            E-Mail gesendet
          </h1>
          <p className="text-muted-foreground">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir Ihnen
            einen Link zum Zurücksetzen des Passworts gesendet.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell footer={footer}>
      <div className="mb-8 space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
          Passwort vergessen
        </h1>
        <p className="text-muted-foreground">
          Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen zu
          erhalten.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <Button
          type="submit"
          className="w-auto px-10"
          disabled={forgotPassword.isPending}
        >
          {forgotPassword.isPending ? "Wird gesendet..." : "Link senden"}
        </Button>
      </form>
    </AuthShell>
  );
}
