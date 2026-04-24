"use client";

import { useState } from "react";
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

  if (submitted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">E-Mail gesendet</CardTitle>
          <CardDescription>
            Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir Ihnen
            einen Link zum Zuruecksetzen des Passworts gesendet.
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Passwort vergessen</CardTitle>
        <CardDescription>
          Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zuruecksetzen zu
          erhalten.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
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
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={forgotPassword.isPending}
          >
            {forgotPassword.isPending ? "Wird gesendet..." : "Link senden"}
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
