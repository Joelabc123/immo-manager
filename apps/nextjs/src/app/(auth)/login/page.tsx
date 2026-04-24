"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

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
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Anmelden</CardTitle>
        <CardDescription>
          Melden Sie sich mit Ihrer E-Mail und Ihrem Passwort an.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
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
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={10}
            />
          </div>
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary underline"
            >
              Passwort vergessen?
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? "Wird angemeldet..." : "Anmelden"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Noch kein Konto?{" "}
            <Link href="/register" className="text-primary underline">
              Registrieren
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
