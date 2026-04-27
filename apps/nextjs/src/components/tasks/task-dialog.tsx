"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_CATEGORIES,
  type TaskStatus,
  type TaskPriority,
  type TaskCategory,
} from "@repo/shared/types";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STATUS_VALUES = Object.values(TASK_STATUSES) as TaskStatus[];
const PRIORITY_VALUES = Object.values(TASK_PRIORITIES) as TaskPriority[];
const CATEGORY_VALUES = Object.values(TASK_CATEGORIES) as TaskCategory[];

interface FromEmailDefaults {
  emailId: string;
  subject: string | null;
  textBody: string | null;
  tenantId: string | null;
  propertyId: string | null;
}

export interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits this existing task. */
  taskId?: string | null;
  /** Pre-fill values when creating from an email. Ignored if taskId is set. */
  fromEmail?: FromEmailDefaults | null;
}

interface FormState {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string;
  tenantId: string;
}

const EMPTY_STATE: FormState = {
  title: "",
  description: "",
  status: TASK_STATUSES.new,
  priority: TASK_PRIORITIES.medium,
  category: TASK_CATEGORIES.other,
  dueDate: "",
  tenantId: "",
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function TaskDialog({
  open,
  onOpenChange,
  taskId,
  fromEmail,
}: TaskDialogProps) {
  const t = useTranslations("tasks");
  const tStatus = useTranslations("tasks.statuses");
  const tPriority = useTranslations("tasks.priorities");
  const tCategory = useTranslations("tasks.categories");
  const isEdit = !!taskId;
  const utils = trpc.useUtils();

  const [form, setForm] = useState<FormState>(EMPTY_STATE);

  const { data: tenantsData } = trpc.tenants.list.useQuery(
    { page: 1, pageSize: 100 },
    { enabled: open },
  );

  const { data: existing } = trpc.tasks.getById.useQuery(
    { id: taskId ?? "" },
    { enabled: open && !!taskId },
  );

  // Initialize form when opening
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;

    if (taskId && existing) {
      setForm({
        title: existing.title,
        description: existing.description ?? "",
        status: existing.status as TaskStatus,
        priority: existing.priority as TaskPriority,
        category: existing.category as TaskCategory,
        dueDate: existing.dueDate ?? "",
        tenantId: existing.tenantId ?? "",
      });
    } else if (!taskId && fromEmail) {
      setForm({
        title: fromEmail.subject ?? "",
        description: truncate(fromEmail.textBody ?? "", 2000),
        status: TASK_STATUSES.new,
        priority: TASK_PRIORITIES.medium,
        category: TASK_CATEGORIES.other,
        dueDate: "",
        tenantId: fromEmail.tenantId ?? "",
      });
    } else if (!taskId) {
      setForm(EMPTY_STATE);
    }
  }, [open, taskId, existing, fromEmail]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tasks.list.invalidate(),
        utils.tasks.listGroupedByTenant.invalidate(),
        utils.tasks.openCount.invalidate(),
        fromEmail
          ? utils.tasks.countsByEmailIds.invalidate()
          : Promise.resolve(),
      ]);
      onOpenChange(false);
    },
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tasks.list.invalidate(),
        utils.tasks.listGroupedByTenant.invalidate(),
        utils.tasks.openCount.invalidate(),
        utils.tasks.getById.invalidate(),
      ]);
      onOpenChange(false);
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tasks.list.invalidate(),
        utils.tasks.listGroupedByTenant.invalidate(),
        utils.tasks.openCount.invalidate(),
      ]);
      onOpenChange(false);
    },
  });

  const tenantOptions = useMemo(() => tenantsData?.items ?? [], [tenantsData]);

  const handleSubmit = () => {
    if (!form.title.trim()) return;

    if (isEdit && taskId) {
      updateMutation.mutate({
        id: taskId,
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        category: form.category,
        dueDate: form.dueDate || null,
        tenantId: form.tenantId || null,
      });
    } else {
      createMutation.mutate({
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        category: form.category,
        dueDate: form.dueDate || null,
        tenantId: form.tenantId || null,
        sourceEmailId: fromEmail?.emailId ?? null,
      });
    }
  };

  const handleDelete = () => {
    if (!taskId) return;
    if (!confirm(t("confirmDelete"))) return;
    deleteMutation.mutate({ id: taskId });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-title">{t("fields.title")}</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("fields.titlePlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="task-description">{t("fields.description")}</Label>
            <Textarea
              id="task-description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(val) =>
                  val && setForm({ ...form, status: val as TaskStatus })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      value ? tStatus(value) : t("fields.select")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s} label={tStatus(s)}>
                      {tStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t("fields.priority")}</Label>
              <Select
                value={form.priority}
                onValueChange={(val) =>
                  val && setForm({ ...form, priority: val as TaskPriority })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      value ? tPriority(value) : t("fields.select")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_VALUES.map((p) => (
                    <SelectItem key={p} value={p} label={tPriority(p)}>
                      {tPriority(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t("fields.category")}</Label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  val && setForm({ ...form, category: val as TaskCategory })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      value ? tCategory(value) : t("fields.select")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_VALUES.map((c) => (
                    <SelectItem key={c} value={c} label={tCategory(c)}>
                      {tCategory(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-due">{t("fields.dueDate")}</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("fields.tenant")}</Label>
            <Select
              value={form.tenantId}
              onValueChange={(val) => setForm({ ...form, tenantId: val ?? "" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => {
                    if (!value) return t("fields.noTenant");
                    const tenant = tenantOptions.find((x) => x.id === value);
                    return tenant
                      ? `${tenant.firstName} ${tenant.lastName}`
                      : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tenantOptions.map((tenant) => (
                  <SelectItem
                    key={tenant.id}
                    value={tenant.id}
                    label={`${tenant.firstName} ${tenant.lastName}`}
                  >
                    {tenant.firstName} {tenant.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter showCloseButton>
          {isEdit && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {t("actions.delete")}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!form.title.trim() || isPending}
          >
            {isEdit ? t("actions.save") : t("actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
