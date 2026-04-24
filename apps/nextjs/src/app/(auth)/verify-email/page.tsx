"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verify = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus("success");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    },
    onError: (err) => {
      setStatus("error");
      setErrorMessage(err.message);
    },
  });

  useEffect(() => {
    if (token) {
      verify.mutate({ token });
    } else {
      setStatus("error");
      setErrorMessage("Kein Verifizierungstoken vorhanden.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">E-Mail Verifizierung</CardTitle>
      </CardHeader>
      <CardContent>
        {status === "loading" && (
          <p className="text-muted-foreground">
            Ihre E-Mail wird verifiziert...
          </p>
        )}
        {status === "success" && (
          <p className="text-green-600">
            E-Mail erfolgreich verifiziert! Sie werden weitergeleitet...
          </p>
        )}
        {status === "error" && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage ?? "Verifizierung fehlgeschlagen."}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/login" className="text-primary underline text-sm">
          Zurueck zur Anmeldung
        </Link>
      </CardFooter>
    </Card>
  );
}
