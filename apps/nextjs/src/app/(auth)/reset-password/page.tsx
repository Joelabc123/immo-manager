"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Ungueltiger Link</CardTitle>
          <CardDescription>
            Dieser Link zum Zuruecksetzen des Passworts ist ungueltig.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/forgot-password"
            className="text-primary underline text-sm"
          >
            Neuen Link anfordern
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Passwort zurueckgesetzt</CardTitle>
          <CardDescription>
            Ihr Passwort wurde erfolgreich zurueckgesetzt. Sie werden zur
            Anmeldung weitergeleitet...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

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

    resetPassword.mutate({
      token: token!,
      password,
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Neues Passwort setzen</CardTitle>
        <CardDescription>
          Geben Sie Ihr neues Passwort ein. Mindestens 10 Zeichen, 1
          Grossbuchstabe, 1 Zahl und 1 Sonderzeichen.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Neues Passwort</Label>
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
            <Label htmlFor="confirmPassword">Passwort bestaetigen</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              minLength={10}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={resetPassword.isPending}
          >
            {resetPassword.isPending
              ? "Wird zurueckgesetzt..."
              : "Passwort zuruecksetzen"}
          </Button>
          <Link
            href="/login"
            className="text-center text-sm text-muted-foreground underline"
          >
            Zurueck zur Anmeldung
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
