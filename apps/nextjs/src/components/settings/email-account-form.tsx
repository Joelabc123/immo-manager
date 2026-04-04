"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@/lib/zod-resolver";
import { createEmailAccountInput } from "@repo/shared/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Trash2, CheckCircle2, XCircle } from "lucide-react";

interface FormValues {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  fromAddress: string;
}

export function EmailAccountForm() {
  const t = useTranslations("settings.emailAccount");
  const utils = trpc.useUtils();

  const { data: account, isLoading } = trpc.email.getAccount.useQuery();

  const createMutation = trpc.email.createAccount.useMutation({
    onSuccess: () => void utils.email.getAccount.invalidate(),
  });
  const updateMutation = trpc.email.updateAccount.useMutation({
    onSuccess: () => void utils.email.getAccount.invalidate(),
  });
  const deleteMutation = trpc.email.deleteAccount.useMutation({
    onSuccess: () => void utils.email.getAccount.invalidate(),
  });
  const testMutation = trpc.email.testConnection.useMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(createEmailAccountInput),
    defaultValues: {
      imapHost: "",
      imapPort: 993,
      smtpHost: "",
      smtpPort: 587,
      username: "",
      password: "",
      fromAddress: "",
    },
  });

  // Populate form when account data loads
  useEffect(() => {
    if (account) {
      form.reset({
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        username: account.username,
        password: "", // Never sent back
        fromAddress: account.fromAddress,
      });
    }
  }, [account, form]);

  const onSubmit = (values: FormValues) => {
    if (account) {
      updateMutation.mutate({
        id: account.id,
        imapHost: values.imapHost,
        imapPort: values.imapPort,
        smtpHost: values.smtpHost,
        smtpPort: values.smtpPort,
        username: values.username,
        password: values.password || undefined,
        fromAddress: values.fromAddress,
      });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleTest = () => {
    const vals = form.getValues();
    testMutation.mutate({
      imapHost: vals.imapHost,
      imapPort: vals.imapPort,
      smtpHost: vals.smtpHost,
      smtpPort: vals.smtpPort,
      username: vals.username,
      password: vals.password,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {/* IMAP */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="imapHost">{t("imapHost")}</Label>
              <Input id="imapHost" {...form.register("imapHost")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="imapPort">{t("imapPort")}</Label>
              <Input
                id="imapPort"
                type="number"
                {...form.register("imapPort", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* SMTP */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="smtpHost">{t("smtpHost")}</Label>
              <Input id="smtpHost" {...form.register("smtpHost")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="smtpPort">{t("smtpPort")}</Label>
              <Input
                id="smtpPort"
                type="number"
                {...form.register("smtpPort", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Credentials */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input id="username" {...form.register("username")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={account ? t("passwordPlaceholder") : ""}
                {...form.register("password")}
              />
            </div>
          </div>

          {/* From Address */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="fromAddress">{t("fromAddress")}</Label>
            <Input
              id="fromAddress"
              type="email"
              {...form.register("fromAddress")}
            />
          </div>

          {/* Test connection result */}
          {testMutation.isSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              {t("testSuccess")}
            </div>
          )}
          {testMutation.isError && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              <XCircle className="h-4 w-4" />
              {t("testFailed")}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {account ? t("update") : t("create")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("test")}
            </Button>
          </div>
          {account && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("delete")}
            </Button>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
