"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Mail as MailIcon, Trash2, Plus, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  type TaskPriority,
  type TaskStatus,
} from "@repo/shared/types";
import { TaskDialog } from "@/components/tasks/task-dialog";

const PRIORITY_DOT_COLORS: Record<TaskPriority, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const STATUS_FILTER_VALUES: (TaskStatus | "all_open" | "all")[] = [
  "all_open",
  TASK_STATUSES.new,
  TASK_STATUSES.in_progress,
  TASK_STATUSES.done,
  TASK_STATUSES.cancelled,
  "all",
];

export default function TasksPage() {
  const t = useTranslations("tasks");
  const tStatus = useTranslations("tasks.statuses");
  const tPriority = useTranslations("tasks.priorities");
  const router = useRouter();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTER_VALUES)[number]>("all_open");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const queryInput = useMemo(() => {
    const statuses: TaskStatus[] | undefined =
      statusFilter === "all"
        ? undefined
        : statusFilter === "all_open"
          ? [TASK_STATUSES.new, TASK_STATUSES.in_progress]
          : [statusFilter];
    return {
      statuses,
      priorities: priorityFilter === "all" ? undefined : [priorityFilter],
      search: search || undefined,
      includeCompleted: statusFilter === "all",
    };
  }, [statusFilter, priorityFilter, search]);

  const { data, isLoading } = trpc.tasks.list.useQuery(queryInput);

  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tasks.list.invalidate(),
        utils.tasks.listGroupedByTenant.invalidate(),
        utils.tasks.openCount.invalidate(),
      ]);
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tasks.list.invalidate(),
        utils.tasks.listGroupedByTenant.invalidate(),
        utils.tasks.openCount.invalidate(),
      ]);
    },
  });

  const handleToggleDone = (taskId: string, currentStatus: string) => {
    const next: TaskStatus =
      currentStatus === TASK_STATUSES.done
        ? TASK_STATUSES.in_progress
        : TASK_STATUSES.done;
    updateStatusMutation.mutate({ id: taskId, status: next });
  };

  const handleDelete = (taskId: string) => {
    if (!confirm(t("confirmDelete"))) return;
    deleteMutation.mutate({ id: taskId });
  };

  const handleCreate = () => {
    setEditingTaskId(null);
    setDialogOpen(true);
  };

  const handleEdit = (taskId: string) => {
    setEditingTaskId(taskId);
    setDialogOpen(true);
  };

  const tasks = data ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("pageSubtitle")}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("actions.create")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  if (!val) return;
                  setStatusFilter(val as (typeof STATUS_FILTER_VALUES)[number]);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue>
                    {(value: string) =>
                      value === "all_open"
                        ? t("filters.openOnly")
                        : value === "all"
                          ? t("filters.all")
                          : value
                            ? tStatus(value)
                            : ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_VALUES.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      label={
                        s === "all_open"
                          ? t("filters.openOnly")
                          : s === "all"
                            ? t("filters.all")
                            : tStatus(s)
                      }
                    >
                      {s === "all_open"
                        ? t("filters.openOnly")
                        : s === "all"
                          ? t("filters.all")
                          : tStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={priorityFilter}
                onValueChange={(val) => {
                  if (!val) return;
                  setPriorityFilter(val as TaskPriority | "all");
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue>
                    {(value: string) =>
                      value === "all"
                        ? t("filters.allPriorities")
                        : value
                          ? tPriority(value)
                          : ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label={t("filters.allPriorities")}>
                    {t("filters.allPriorities")}
                  </SelectItem>
                  {Object.values(TASK_PRIORITIES).map((p) => (
                    <SelectItem key={p} value={p} label={tPriority(p)}>
                      {tPriority(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {tasks.map((task) => {
                const isDone = task.status === TASK_STATUSES.done;
                const dotColor =
                  PRIORITY_DOT_COLORS[task.priority as TaskPriority] ??
                  "bg-gray-400";
                const tenantLabel =
                  task.tenantFirstName || task.tenantLastName
                    ? `${task.tenantFirstName ?? ""} ${task.tenantLastName ?? ""}`.trim()
                    : t("withoutTenant");
                return (
                  <div
                    key={task.id}
                    className="group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40 cursor-pointer"
                    onClick={() => handleEdit(task.id)}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={() =>
                          handleToggleDone(task.id, task.status)
                        }
                      />
                    </div>
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          isDone && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tenantLabel}
                        {task.propertyStreet ? ` · ${task.propertyStreet}` : ""}
                        {task.rentalUnitName ? `, ${task.rentalUnitName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {tStatus(task.status)}
                      </Badge>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          {task.dueDate}
                        </span>
                      )}
                      {task.sourceEmailId && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/mail?emailId=${task.sourceEmailId}`);
                          }}
                          title={t("actions.openEmail")}
                        >
                          <MailIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(task.id);
                        }}
                        title={t("actions.delete")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTaskId(null);
        }}
        taskId={editingTaskId}
      />
    </div>
  );
}
