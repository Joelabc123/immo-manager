"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bold, Italic, List, ListOrdered, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "./template-selector";
import { AiGenerateButton } from "@/components/ai/ai-generate-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type ReplyTone = "formal" | "friendly" | "short";

interface ReplyEditorProps {
  accountId: string;
  replyTo?: string;
  initialTo?: string;
  initialSubject?: string;
  /** Source email id (when replying). Enables AI reply generation. */
  sourceEmailId?: string;
  onSent?: () => void;
  onCancel?: () => void;
}

export function ReplyEditor({
  accountId,
  replyTo,
  initialTo = "",
  initialSubject = "",
  sourceEmailId,
  onSent,
  onCancel,
}: ReplyEditorProps) {
  const t = useTranslations("email");
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(
    initialSubject
      ? initialSubject.startsWith("Re:")
        ? initialSubject
        : `Re: ${initialSubject}`
      : "",
  );

  const utils = trpc.useUtils();

  /** Tone selected by user, awaiting overwrite confirmation. */
  const [pendingTone, setPendingTone] = useState<ReplyTone | null>(null);

  const sendMutation = trpc.email.send.useMutation({
    onSuccess: () => {
      void utils.email.list.invalidate();
      editor?.commands.clearContent();
      onSent?.();
    },
  });

  const generateReplyMutation = trpc.ai.generateReply.useMutation();

  const runAiGenerate = async (tone: ReplyTone) => {
    if (!sourceEmailId || !editor) return;
    try {
      const existing = editor.getHTML();
      const res = await generateReplyMutation.mutateAsync({
        emailId: sourceEmailId,
        tone,
        existingDraft:
          existing && existing !== "<p></p>" ? existing : undefined,
      });
      editor.commands.setContent(res.html);
    } catch {
      alert(t("ai.error"));
    }
  };

  const handleAiGenerate = (tone: ReplyTone) => {
    if (!sourceEmailId || !editor) return;
    const existing = editor.getHTML();
    const hasContent = !!existing && existing !== "<p></p>";
    if (hasContent) {
      setPendingTone(tone);
      return;
    }
    void runAiGenerate(tone);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: t("compose.placeholder"),
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[120px] p-3 focus:outline-none",
      },
    },
  });

  const handleSend = () => {
    if (!to || !editor) return;
    const html = editor.getHTML();
    if (!html || html === "<p></p>") return;

    sendMutation.mutate({
      accountId,
      to: to.split(",").map((addr) => addr.trim()),
      subject,
      htmlBody: html,
      replyToMessageId: replyTo,
    });
  };

  const handleTemplateSelect = (template: {
    subject: string;
    body: string;
  }) => {
    setSubject(template.subject);
    editor?.commands.setContent(template.body);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
      {/* To */}
      <div className="flex items-center gap-2">
        <Label className="w-16 shrink-0 text-xs">{t("compose.to")}</Label>
        <Input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="email@example.com"
          className="h-8 text-sm"
        />
      </div>

      {/* Subject */}
      <div className="flex items-center gap-2">
        <Label className="w-16 shrink-0 text-xs">{t("compose.subject")}</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b pb-2">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold") ?? false}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic") ?? false}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList") ?? false}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList") ?? false}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        {sourceEmailId && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <AiGenerateButton
                  onClick={() => {}}
                  loading={generateReplyMutation.isPending}
                  title={t("ai.tooltip")}
                />
              }
            />
            <DropdownMenuContent align="start" className="min-w-44">
              <DropdownMenuItem
                onClick={() => {
                  handleAiGenerate("formal");
                }}
              >
                {t("ai.tone.formal")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  handleAiGenerate("friendly");
                }}
              >
                {t("ai.tone.friendly")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  handleAiGenerate("short");
                }}
              >
                {t("ai.tone.short")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Dialog
          open={pendingTone !== null}
          onOpenChange={(next) => {
            if (!next) setPendingTone(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("ai.overwriteTitle")}</DialogTitle>
              <DialogDescription>{t("ai.confirmOverwrite")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPendingTone(null)}
              >
                {t("ai.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  const tone = pendingTone;
                  setPendingTone(null);
                  if (tone) void runAiGenerate(tone);
                }}
              >
                {t("ai.overwriteAction")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="mx-1 h-5 w-px bg-border" />
        <TemplateSelector onSelect={handleTemplateSelect} />
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="rounded-md border" />

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t("compose.cancel")}
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!to || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {t("compose.send")}
        </Button>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-md p-1.5 transition-colors hover:bg-muted",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}
