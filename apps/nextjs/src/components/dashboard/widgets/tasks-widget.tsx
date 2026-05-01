"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Square,
  Mail as MailIcon,
  Trash2,
  Users,
  ChevronRight,
} from "lucide-react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
  type WidgetSizeVariant,
} from "@repo/shared/types";
import { TaskDialog } from "../../tasks/task-dialog";

interface TaskWidgetProps {
  config?: Record<string, unknown>;
  variant?: WidgetSizeVariant;
}

const PRIORITY_DOT_COLORS: Record<TaskPriority, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const STATUS_BADGE_VARIANT: Record<
  TaskStatus,
  "default" | "secondary" | "outline" | "ghost"
> = {
  new: "outline",
  in_progress: "secondary",
  done: "default",
  cancelled: "ghost",
};

function sortTasks(tasks: TaskRow[]): TaskRow[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority as TaskPriority] ?? 99;
    const pb = PRIORITY_RANK[b.priority as TaskPriority] ?? 99;
    if (pa !== pb) return pa - pb;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  tenantId: string | null;
  sourceEmailId: string | null;
}

interface TenantGroup {
  tenantId: string | null;
  tenantFirstName: string | null;
  tenantLastName: string | null;
  propertyStreet: string | null;
  propertyCity: string | null;
  rentalUnitName: string | null;
  tasks: TaskRow[];
}

function buildPropertyLabel(group: TenantGroup): string | null {
  const parts: string[] = [];
  if (group.propertyStreet) parts.push(group.propertyStreet);
  if (group.rentalUnitName) parts.push(group.rentalUnitName);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function TasksWidget({ variant = "xl" }: TaskWidgetProps) {
  const t = useTranslations("dashboard.tasks");
  const tStatus = useTranslations("tasks.statuses");
  const router = useRouter();
  const utils = trpc.useUtils();

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: groups, isLoading } = trpc.tasks.listGroupedByTenant.useQuery();

  const sortedGroups = useMemo<TenantGroup[]>(() => {
    return ((groups ?? []) as TenantGroup[]).map((g) => ({
      ...g,
      tasks: sortTasks(g.tasks),
    }));
  }, [groups]);

  const totalCount = useMemo(
    () => sortedGroups.reduce((sum, g) => sum + g.tasks.length, 0),
    [sortedGroups],
  );

  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tasks.listGroupedByTenant.invalidate(),
        utils.tasks.list.invalidate(),
        utils.tasks.openCount.invalidate(),
        utils.tasks.countsByEmailIds.invalidate(),
      ]);
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tasks.listGroupedByTenant.invalidate(),
        utils.tasks.list.invalidate(),
        utils.tasks.openCount.invalidate(),
        utils.tasks.countsByEmailIds.invalidate(),
      ]);
    },
  });

  const handleToggleDone = (task: TaskRow) => {
    const next: TaskStatus =
      task.status === TASK_STATUSES.done
        ? TASK_STATUSES.in_progress
        : TASK_STATUSES.done;
    updateStatusMutation.mutate({ id: task.id, status: next });
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    updateStatusMutation.mutate({ id: taskId, status });
  };

  const handleDelete = (taskId: string) => {
    if (!confirm(t("confirmDelete"))) return;
    deleteMutation.mutate({ id: taskId });
  };

  const handleOpenEmail = (emailId: string) => {
    router.push(`/mail?emailId=${emailId}`);
  };

  const handleOpenTenant = (tenantId: string | null) => {
    if (!tenantId) return;
    router.push(`/tenants/${tenantId}`);
  };

  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("title")}</p>
        </CardHeader>
        <CardContent className="flex flex-1 min-h-0 flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </>
    );
  }

  const isHero = variant === "hero";
  const groupListClass = isHero
    ? "grid gap-3 xl:grid-cols-2"
    : "flex flex-col gap-3";

  return (
    <TooltipProvider>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{t("title")}</p>
          {totalCount > 0 && <Badge variant="secondary">{totalCount}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 min-h-0 flex-col overflow-hidden p-0">
        {sortedGroups.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {t("noOpenTasks")}
          </div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className={cn(groupListClass, "px-4 pb-4")}>
              {sortedGroups.map((group) => (
                <TenantGroupBlock
                  key={group.tenantId ?? "__unassigned__"}
                  group={group}
                  isHero={isHero}
                  onToggleDone={handleToggleDone}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onOpenEmail={handleOpenEmail}
                  onOpenTenant={handleOpenTenant}
                  onEditTask={handleEditTask}
                  tStatus={tStatus}
                  tWithoutTenant={t("withoutTenant")}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTaskId(null);
        }}
        taskId={editingTaskId}
      />
    </TooltipProvider>
  );
}

interface TenantGroupBlockProps {
  group: TenantGroup;
  isHero: boolean;
  onToggleDone: (task: TaskRow) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  onOpenEmail: (emailId: string) => void;
  onOpenTenant: (tenantId: string | null) => void;
  onEditTask: (taskId: string) => void;
  tStatus: (key: string) => string;
  tWithoutTenant: string;
}

function TenantGroupBlock({
  group,
  isHero,
  onToggleDone,
  onStatusChange,
  onDelete,
  onOpenEmail,
  onOpenTenant,
  onEditTask,
  tStatus,
  tWithoutTenant,
}: TenantGroupBlockProps) {
  const tenantName = group.tenantId
    ? `${group.tenantFirstName ?? ""} ${group.tenantLastName ?? ""}`.trim()
    : tWithoutTenant;
  const propertyLabel = buildPropertyLabel(group);

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 border-b px-3 py-2 text-left",
          group.tenantId &&
            "cursor-pointer transition-colors hover:bg-muted/50",
        )}
        onClick={() => onOpenTenant(group.tenantId)}
        disabled={!group.tenantId}
      >
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{tenantName}</p>
          {propertyLabel && (
            <p className="truncate text-xs text-muted-foreground">
              {propertyLabel}
            </p>
          )}
        </div>
        {group.tenantId && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      <div className="divide-y">
        {group.tasks.map((task) => (
          <TaskRowItem
            key={task.id}
            task={task}
            isHero={isHero}
            onToggleDone={onToggleDone}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onOpenEmail={onOpenEmail}
            onEditTask={onEditTask}
            tStatus={tStatus}
          />
        ))}
      </div>
    </div>
  );
}

interface TaskRowItemProps {
  task: TaskRow;
  isHero: boolean;
  onToggleDone: (task: TaskRow) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  onOpenEmail: (emailId: string) => void;
  onEditTask: (taskId: string) => void;
  tStatus: (key: string) => string;
}

function TaskRowItem({
  task,
  isHero,
  onToggleDone,
  onStatusChange,
  onDelete,
  onOpenEmail,
  onEditTask,
  tStatus,
}: TaskRowItemProps) {
  const isDone = task.status === TASK_STATUSES.done;
  const dotColor =
    PRIORITY_DOT_COLORS[task.priority as TaskPriority] ?? "bg-gray-400";

  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/40 cursor-pointer"
      onClick={() => onEditTask(task.id)}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-7 w-7 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(task);
        }}
        title={isDone ? "Reopen" : "Done"}
      >
        {isDone ? (
          <CheckSquare className="h-4 w-4 text-green-600" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </Button>

      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <p
                className={cn(
                  "truncate text-sm",
                  isDone && "text-muted-foreground line-through",
                )}
              />
            }
          >
            {task.title}
          </TooltipTrigger>
          <TooltipContent>{task.title}</TooltipContent>
        </Tooltip>
        {task.dueDate && (
          <p className="truncate text-xs text-muted-foreground">
            {task.dueDate}
          </p>
        )}
      </div>

      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={false}
            render={
              <Badge
                variant={
                  STATUS_BADGE_VARIANT[task.status as TaskStatus] ?? "outline"
                }
                className={cn(
                  "h-6 cursor-pointer px-2 text-xs",
                  isHero ? "min-w-[96px]" : "min-w-[80px]",
                )}
              />
            }
          >
            {tStatus(task.status)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(
              [
                TASK_STATUSES.new,
                TASK_STATUSES.in_progress,
                TASK_STATUSES.done,
                TASK_STATUSES.cancelled,
              ] as const
            ).map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => onStatusChange(task.id, status)}
              >
                {tStatus(status)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {task.sourceEmailId && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={() =>
              task.sourceEmailId && onOpenEmail(task.sourceEmailId)
            }
            title="Open source email"
          >
            <MailIcon className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 opacity-0 group-hover:opacity-100"
          onClick={() => onDelete(task.id)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
