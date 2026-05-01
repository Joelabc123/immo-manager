"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  ChevronLeft,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Send,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/components/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AiGenerateButton } from "@/components/ai/ai-generate-button";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "./template-selector";
import { RecipientPicker, type RecipientSelection } from "./recipient-picker";

type ComposeTone = "formal" | "friendly" | "short";

interface ComposeDraft {
  subject: string;
  htmlBody: string;
  to: RecipientSelection[];
  cc: RecipientSelection[];
  bcc: RecipientSelection[];
}

const EMPTY_HTML = "<p></p>";

function isEmptyHtml(value: string): boolean {
  return !value || value === EMPTY_HTML;
}

function selectedContext(recipients: RecipientSelection[]): {
  tenantId?: string;
  propertyId?: string;
} {
  const tenantIds = new Set(
    recipients.map((item) => item.tenantId).filter((id): id is string => !!id),
  );
  const propertyIds = new Set(
    recipients
      .map((item) => item.propertyId)
      .filter((id): id is string => !!id),
  );

  return {
    tenantId: tenantIds.size === 1 ? [...tenantIds][0] : undefined,
    propertyId: propertyIds.size === 1 ? [...propertyIds][0] : undefined,
  };
}

export function MailComposeEditor() {
  const t = useTranslations("email");
  const router = useRouter();
  const { user } = useUser();
  const utils = trpc.useUtils();
  const { data: accounts } = trpc.email.getAccounts.useQuery();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [to, setTo] = useState<RecipientSelection[]>([]);
  const [cc, setCc] = useState<RecipientSelection[]>([]);
  const [bcc, setBcc] = useState<RecipientSelection[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState(EMPTY_HTML);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [pendingTone, setPendingTone] = useState<ComposeTone | null>(null);

  const activeAccountId = selectedAccountId ?? accounts?.[0]?.id ?? null;
  const draftKey = activeAccountId
    ? `immo-mail-compose:${user?.id ?? "anonymous"}:${activeAccountId}`
    : null;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: t("compose.placeholder") }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[280px] p-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => setHtmlBody(instance.getHTML()),
  });

  const sendMutation = trpc.email.send.useMutation({
    onSuccess: async () => {
      if (draftKey) localStorage.removeItem(draftKey);
      await Promise.all([
        utils.email.list.invalidate(),
        utils.email.listFolders.invalidate(),
      ]);
      router.push("/mail");
    },
  });

  const improveMutation = trpc.ai.improveEmailDraft.useMutation();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!draftKey || !editor) return;
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const draft = JSON.parse(raw) as ComposeDraft;
        setSubject(draft.subject ?? "");
        setTo(draft.to ?? []);
        setCc(draft.cc ?? []);
        setBcc(draft.bcc ?? []);
        setShowCcBcc(
          (draft.cc?.length ?? 0) > 0 || (draft.bcc?.length ?? 0) > 0,
        );
        const body = draft.htmlBody || EMPTY_HTML;
        setHtmlBody(body);
        editor.commands.setContent(body);
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
    setDraftLoaded(true);
  }, [draftKey, editor]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!draftKey || !draftLoaded) return;
    const draft: ComposeDraft = { subject, htmlBody, to, cc, bcc };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [bcc, cc, draftKey, draftLoaded, htmlBody, subject, to]);

  const allRecipients = useMemo(() => [...to, ...cc, ...bcc], [bcc, cc, to]);
  const context = selectedContext(allRecipients);
  const recipientEmails = allRecipients.map((recipient) => recipient.email);
  const canSend =
    !!activeAccountId &&
    to.length > 0 &&
    subject.trim() !== "" &&
    !isEmptyHtml(htmlBody) &&
    !sendMutation.isPending;
  const canImprove =
    !!activeAccountId &&
    recipientEmails.length > 0 &&
    subject.trim() !== "" &&
    !isEmptyHtml(htmlBody) &&
    !improveMutation.isPending;

  const handleTemplateSelect = (template: {
    subject: string;
    body: string;
  }) => {
    setSubject(template.subject);
    setHtmlBody(template.body);
    editor?.commands.setContent(template.body);
  };

  const runImprove = async (tone: ComposeTone) => {
    if (!activeAccountId || !editor) return;
    try {
      const result = await improveMutation.mutateAsync({
        accountId: activeAccountId,
        subject,
        htmlBody: editor.getHTML(),
        tone,
        recipients: recipientEmails,
        tenantId: context.tenantId,
        propertyId: context.propertyId,
      });
      setSubject(result.subject);
      setHtmlBody(result.html);
      editor.commands.setContent(result.html);
    } catch {
      alert(t("ai.error"));
    }
  };

  const handleImproveSelect = (tone: ComposeTone) => {
    if (!canImprove) return;
    setPendingTone(tone);
  };

  const handleSend = () => {
    if (!activeAccountId || !editor || !canSend) return;
    sendMutation.mutate({
      accountId: activeAccountId,
      to: to.map((recipient) => recipient.email),
      cc: cc.length > 0 ? cc.map((recipient) => recipient.email) : undefined,
      bcc: bcc.length > 0 ? bcc.map((recipient) => recipient.email) : undefined,
      subject: subject.trim(),
      htmlBody: editor.getHTML(),
      tenantId: context.tenantId,
      propertyId: context.propertyId,
    });
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
        {t("noAccount")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/mail")}
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            {t("compose.backToMail")}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("compose.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("compose.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">{t("compose.account")}</Label>
          <Select
            value={activeAccountId ?? ""}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="h-9 w-64">
              <SelectValue>
                {(value: string) => {
                  const account = accounts.find((item) => item.id === value);
                  return account?.label || account?.fromAddress || value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem
                  key={account.id}
                  value={account.id}
                  label={account.label || account.fromAddress}
                >
                  {account.label || account.fromAddress}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        <RecipientPicker
          label={t("compose.to")}
          value={to}
          onChange={setTo}
          placeholder={t("compose.recipientPlaceholder")}
          addLabel={t("compose.addRecipient")}
          tenantDropdownLabel={t("compose.selectTenantEmail")}
        />

        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCcBcc((prev) => !prev)}
          >
            {showCcBcc ? t("compose.hideCcBcc") : t("compose.showCcBcc")}
          </Button>
        </div>

        {showCcBcc && (
          <div className="grid gap-4 md:grid-cols-2">
            <RecipientPicker
              label={t("compose.cc")}
              value={cc}
              onChange={setCc}
              placeholder={t("compose.recipientPlaceholder")}
              addLabel={t("compose.addRecipient")}
              tenantDropdownLabel={t("compose.selectTenantEmail")}
            />
            <RecipientPicker
              label={t("compose.bcc")}
              value={bcc}
              onChange={setBcc}
              placeholder={t("compose.recipientPlaceholder")}
              addLabel={t("compose.addRecipient")}
              tenantDropdownLabel={t("compose.selectTenantEmail")}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label className="text-xs" htmlFor="compose-subject">
            {t("compose.subject")}
          </Label>
          <Input
            id="compose-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>

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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <AiGenerateButton
                  onClick={() => {}}
                  loading={improveMutation.isPending}
                  disabled={!canImprove}
                  title={t("ai.improveTooltip")}
                />
              }
            />
            <DropdownMenuContent align="start" className="min-w-44">
              <DropdownMenuItem onClick={() => handleImproveSelect("formal")}>
                {t("ai.tone.formal")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleImproveSelect("friendly")}>
                {t("ai.tone.friendly")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleImproveSelect("short")}>
                {t("ai.tone.short")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="mx-1 h-5 w-px bg-border" />
          <TemplateSelector onSelect={handleTemplateSelect} />
        </div>

        <EditorContent editor={editor} className="rounded-md border" />

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => router.push("/mail")}>
            {t("compose.cancel")}
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sendMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {t("compose.send")}
          </Button>
        </div>
      </div>

      <Dialog
        open={pendingTone !== null}
        onOpenChange={(next) => {
          if (!next) setPendingTone(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("ai.improveOverwriteTitle")}</DialogTitle>
            <DialogDescription>
              {t("ai.improveConfirmOverwrite")}
            </DialogDescription>
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
                if (tone) void runImprove(tone);
              }}
            >
              {t("ai.overwriteAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
