"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@/lib/zod-resolver";
import { createEmailAccountInput } from "@repo/shared/validation";
import { SYNC_INTERVAL_OPTIONS } from "@repo/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Star,
  AlertCircle,
} from "lucide-react";

interface FormValues {
  label: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  fromAddress: string;
  syncIntervalMinutes: number;
}

export function EmailAccountForm() {
  const t = useTranslations("settings.emailAccount");
  const utils = trpc.useUtils();

  const { data: accounts, isLoading } = trpc.email.getAccounts.useQuery();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const createMutation = trpc.email.createAccount.useMutation({
    onSuccess: () => {
      void utils.email.getAccounts.invalidate();
      setShowForm(false);
      form.reset();
    },
  });
  const updateMutation = trpc.email.updateAccount.useMutation({
    onSuccess: () => {
      void utils.email.getAccounts.invalidate();
      setEditingId(null);
    },
  });
  const deleteMutation = trpc.email.deleteAccount.useMutation({
    onSuccess: () => void utils.email.getAccounts.invalidate(),
  });
  const setDefaultMutation = trpc.email.setDefaultAccount.useMutation({
    onSuccess: () => void utils.email.getAccounts.invalidate(),
  });
  const testMutation = trpc.email.testConnection.useMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(createEmailAccountInput),
    defaultValues: {
      label: "",
      imapHost: "",
      imapPort: 993,
      smtpHost: "",
      smtpPort: 587,
      username: "",
      password: "",
      fromAddress: "",
      syncIntervalMinutes: 15,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (editingId && accounts) {
      const account = accounts.find((a) => a.id === editingId);
      if (account) {
        form.reset({
          label: account.label,
          imapHost: account.imapHost,
          imapPort: account.imapPort,
          smtpHost: account.smtpHost,
          smtpPort: account.smtpPort,
          username: account.username,
          password: "",
          fromAddress: account.fromAddress,
          syncIntervalMinutes: account.syncIntervalMinutes,
        });
      }
    }
  }, [editingId, accounts, form]);

  const onSubmit = (values: FormValues) => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        label: values.label,
        imapHost: values.imapHost,
        imapPort: values.imapPort,
        smtpHost: values.smtpHost,
        smtpPort: values.smtpPort,
        username: values.username,
        password: values.password || undefined,
        fromAddress: values.fromAddress,
        syncIntervalMinutes: values.syncIntervalMinutes as
          | 5
          | 10
          | 15
          | 30
          | 60,
      });
    } else {
      createMutation.mutate({
        ...values,
        syncIntervalMinutes: values.syncIntervalMinutes as
          | 5
          | 10
          | 15
          | 30
          | 60,
      });
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

  const handleStartAdd = () => {
    setEditingId(null);
    form.reset({
      label: "",
      imapHost: "",
      imapPort: 993,
      smtpHost: "",
      smtpPort: 587,
      username: "",
      password: "",
      fromAddress: "",
      syncIntervalMinutes: 15,
    });
    testMutation.reset();
    setShowForm(true);
  };

  const handleStartEdit = (accountId: string) => {
    setShowForm(false);
    testMutation.reset();
    setEditingId(accountId);
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowForm(false);
    testMutation.reset();
    form.reset();
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
  const isFormVisible = showForm || editingId !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Account List */}
      {accounts && accounts.length > 0 && (
        <div className="flex flex-col gap-2">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {account.label || account.fromAddress}
                    </span>
                    {account.syncStatus === "syncing" && (
                      <Badge variant="secondary" className="text-xs">
                        {t("syncing")}
                      </Badge>
                    )}
                    {account.syncStatus === "error" && (
                      <Badge variant="destructive" className="text-xs">
                        {t("error")}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {account.fromAddress} — {account.imapHost}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setDefaultMutation.mutate({ accountId: account.id })
                    }
                    title={t("setDefault")}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleStartEdit(account.id)}
                    title={t("update")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      deleteMutation.mutate({ accountId: account.id })
                    }
                    disabled={deleteMutation.isPending}
                    title={t("delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Form */}
      {isFormVisible ? (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader className="pb-4">
              <h3 className="text-sm font-semibold">
                {editingId ? t("update") : t("create")}
              </h3>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Mutation error */}
              {(createMutation.isError || updateMutation.isError) && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {t("saveFailed")}
                </div>
              )}

              {/* Label */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="label">{t("label")}</Label>
                <Input
                  id="label"
                  placeholder={t("labelPlaceholder")}
                  {...form.register("label")}
                />
              </div>

              {/* IMAP */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="imapHost">{t("imapHost")}</Label>
                  <Input id="imapHost" {...form.register("imapHost")} />
                  {form.formState.errors.imapHost && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.imapHost.message}
                    </span>
                  )}
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
                  {form.formState.errors.smtpHost && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.smtpHost.message}
                    </span>
                  )}
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
                  {form.formState.errors.username && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.username.message}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <PasswordInput
                    id="password"
                    placeholder={editingId ? t("passwordPlaceholder") : ""}
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </span>
                  )}
                </div>
              </div>

              {/* From Address + Sync Interval */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fromAddress">{t("fromAddress")}</Label>
                  <Input
                    id="fromAddress"
                    type="email"
                    {...form.register("fromAddress")}
                  />
                  {form.formState.errors.fromAddress && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.fromAddress.message}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("syncInterval")}</Label>
                  <Select
                    value={String(form.watch("syncIntervalMinutes"))}
                    onValueChange={(val) =>
                      form.setValue("syncIntervalMinutes", Number(val))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYNC_INTERVAL_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={String(opt)}>
                          {opt} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Test connection result */}
              {testMutation.isSuccess &&
                testMutation.data.imap &&
                testMutation.data.smtp && (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("testSuccess")}
                  </div>
                )}
              {(testMutation.isError ||
                (testMutation.isSuccess &&
                  (!testMutation.data.imap || !testMutation.data.smtp))) && (
                <div className="flex flex-col gap-1 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {t("testFailed")}
                  </div>
                  {testMutation.isSuccess &&
                    !testMutation.data.imap &&
                    testMutation.data.imapError && (
                      <span className="ml-6 text-xs">
                        IMAP: {testMutation.data.imapError}
                      </span>
                    )}
                  {testMutation.isSuccess &&
                    !testMutation.data.smtp &&
                    testMutation.data.smtpError && (
                      <span className="ml-6 text-xs">
                        SMTP: {testMutation.data.smtpError}
                      </span>
                    )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingId ? t("update") : t("create")}
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
                <Button type="button" variant="ghost" onClick={handleCancel}>
                  {t("cancel")}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      ) : (
        <Button variant="outline" onClick={handleStartAdd} className="w-fit">
          <Plus className="mr-2 h-4 w-4" />
          {t("addAccount")}
        </Button>
      )}
    </div>
  );
}
