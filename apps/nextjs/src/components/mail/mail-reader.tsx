"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@repo/shared/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ManualAssignDialog } from "./manual-assign-dialog";
import { TaskDialog } from "@/components/tasks/task-dialog";
import {
  ArrowLeft,
  Reply,
  UserPlus,
  Eye,
  Send,
  Mail as MailIcon,
  ClipboardCheck,
  CheckSquare,
} from "lucide-react";

const ReplyEditor = dynamic(
  () => import("./reply-editor").then((m) => ({ default: m.ReplyEditor })),
  { ssr: false },
);

interface MailReaderProps {
  emailId: string;
  accountId: string;
  onBack: () => void;
}

export function MailReader({ emailId, accountId, onBack }: MailReaderProps) {
  const t = useTranslations("email");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showReplyEditor, setShowReplyEditor] = useState(false);

  const utils = trpc.useUtils();

  const { data: body, isLoading: bodyLoading } = trpc.email.getBody.useQuery({
    emailId,
  });

  const { data: thread } = trpc.email.getThread.useQuery(
    { threadId: body?.email?.threadId ?? "", accountId },
    { enabled: !!body?.email?.threadId },
  );

  const { data: taskCounts } = trpc.tasks.countsByEmailIds.useQuery(
    { emailIds: [emailId] },
    { enabled: !!emailId },
  );
  const taskCount = taskCounts?.[emailId] ?? 0;

  const markReadMutation = trpc.email.markRead.useMutation({
    onSuccess: () => {
      void utils.email.list.invalidate();
      void utils.email.getUnreadCount.invalidate();
    },
  });

  // Mark as read when opened
  const email = body?.email;
  if (email && !email.isRead) {
    markReadMutation.mutate({ emailId, isRead: true });
  }

  if (bodyLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  const hasThread = thread && thread.length > 1;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <h2 className="truncate text-base font-semibold">
            {email.subject || "(No Subject)"}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {email.isInbound ? (
              <MailIcon className="h-3 w-3 shrink-0" />
            ) : (
              <Send className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">{email.fromAddress}</span>
            <span className="shrink-0">
              {formatDate(new Date(email.receivedAt))}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {email.openedAt && (
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              {t("opened")}
            </Badge>
          )}
          {taskCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <ClipboardCheck className="h-3 w-3" />
              {t("taskCreated", { count: taskCount })}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowTaskDialog(true)}
            title={t("createTask")}
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowAssignDialog(true)}
            title={t("assign.title")}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowReplyEditor(!showReplyEditor)}
            title={t("reply")}
          >
            <Reply className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Labels */}
      {body?.labels && body.labels.length > 0 && (
        <div className="flex items-center gap-1.5 border-b px-3 py-1.5">
          {body.labels.map((label) => (
            <Badge key={label.id} variant="secondary" className="text-xs gap-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Thread indicator */}
      {hasThread && (
        <div className="border-b px-3 py-1.5 text-xs text-muted-foreground">
          {t("threadCount", { count: thread.length })}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto p-4">
        {hasThread ? (
          <ThreadView emails={thread} currentId={emailId} />
        ) : (
          <EmailBody html={body.html} text={body.text} />
        )}
      </div>

      {/* Reply editor */}
      {showReplyEditor && (
        <div className="border-t p-3">
          <ReplyEditor
            accountId={accountId}
            replyTo={email.messageId}
            sourceEmailId={emailId}
            initialTo={
              email.isInbound ? email.fromAddress : (email.toAddresses ?? "")
            }
            initialSubject={email.subject}
            onSent={() => setShowReplyEditor(false)}
            onCancel={() => setShowReplyEditor(false)}
          />
        </div>
      )}

      <ManualAssignDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        emailId={emailId}
      />

      <TaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        fromEmail={{
          emailId,
          subject: email.subject ?? null,
          textBody: email.textBody ?? null,
          tenantId: email.tenantId ?? null,
          propertyId: email.propertyId ?? null,
        }}
      />
    </div>
  );
}

function ThreadView({
  emails,
  currentId,
}: {
  emails: {
    id: string;
    fromAddress: string;
    receivedAt: Date | string;
    isInbound: boolean;
  }[];
  currentId: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {emails.map((email) => (
        <ThreadMessage
          key={email.id}
          emailId={email.id}
          fromAddress={email.fromAddress}
          receivedAt={email.receivedAt}
          isInbound={email.isInbound}
          isExpanded={email.id === currentId}
        />
      ))}
    </div>
  );
}

function ThreadMessage({
  emailId,
  fromAddress,
  receivedAt,
  isInbound,
  isExpanded: initialExpanded,
}: {
  emailId: string;
  fromAddress: string;
  receivedAt: Date | string;
  isInbound: boolean;
  isExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const { data } = trpc.email.getBody.useQuery(
    { emailId },
    { enabled: expanded },
  );

  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50",
          expanded && "border-b",
        )}
      >
        {isInbound ? (
          <MailIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Send className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate font-medium">{fromAddress}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(new Date(receivedAt))}
        </span>
      </button>
      {expanded && data && (
        <div className="p-3">
          <EmailBody html={data.html} text={data.text} />
        </div>
      )}
    </div>
  );
}

function EmailBody({
  html,
  text,
}: {
  html?: string | null;
  text?: string | null;
}) {
  if (html) {
    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none break-words"
        // HTML is sanitized with DOMPurify on the server before being sent
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (text) {
    return <pre className="whitespace-pre-wrap text-sm font-sans">{text}</pre>;
  }

  return <p className="text-sm text-muted-foreground">No content</p>;
}
