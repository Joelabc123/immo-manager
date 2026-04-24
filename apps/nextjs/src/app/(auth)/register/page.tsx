"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const register = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      if (data.requiresVerification) {
        setVerificationSent(true);
      } else {
        router.push("/");
        router.refresh();
      }
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

    register.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password,
    });
  }

  if (verificationSent) {
    return (
      <AuthShell
        footer={
          <span>
            Bereits bestätigt?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Anmelden
            </Link>
          </span>
        }
      >
        <div className="mb-8 space-y-3">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
            E-Mail bestätigen
          </h1>
          <p className="text-muted-foreground">
            Wir haben Ihnen eine E-Mail mit einem Verifizierungslink gesendet.
            Bitte überprüfen Sie Ihren Posteingang.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      footer={
        <span>
          Bereits ein Konto?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Anmelden
          </Link>
        </span>
      }
    >
      <div className="mb-8 space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
          Konto erstellen
        </h1>
        <p className="text-muted-foreground">
          Erstellen Sie ein neues Konto für den Immo Manager.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Max Mustermann"
          />
        </div>

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
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={10}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={10}
          />
        </div>

        <Button
          type="submit"
          className="w-auto px-10"
          disabled={register.isPending}
        >
          {register.isPending ? "Wird registriert..." : "Registrieren"}
        </Button>
      </form>
    </AuthShell>
  );
}
