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

  if (verificationSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">E-Mail bestaetigen</CardTitle>
          <CardDescription>
            Wir haben Ihnen eine E-Mail mit einem Verifizierungslink gesendet.
            Bitte ueberpruefen Sie Ihren Posteingang.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="text-primary underline text-sm">
            Zurueck zur Anmeldung
          </Link>
        </CardFooter>
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

    register.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password,
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Registrieren</CardTitle>
        <CardDescription>
          Erstellen Sie ein neues Konto fuer den Immo Manager.
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
            disabled={register.isPending}
          >
            {register.isPending ? "Wird registriert..." : "Registrieren"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Bereits ein Konto?{" "}
            <Link href="/login" className="text-primary underline">
              Anmelden
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
