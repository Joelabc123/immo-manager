"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CaretDownIcon,
  CheckIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DashboardPreset } from "@repo/shared/types";

type DialogMode =
  | { kind: "idle" }
  | { kind: "create" }
  | { kind: "rename"; preset: DashboardPreset }
  | { kind: "duplicate"; preset: DashboardPreset }
  | { kind: "delete"; preset: DashboardPreset };

interface PresetManagerProps {
  presets: DashboardPreset[];
  activePresetId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  disabled?: boolean;
}

export function PresetManager({
  presets,
  activePresetId,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onSetDefault,
  disabled,
}: PresetManagerProps) {
  const t = useTranslations("dashboard.bento.presets");
  const [dialog, setDialog] = useState<DialogMode>({ kind: "idle" });
  const [name, setName] = useState("");

  const active = presets.find((p) => p.id === activePresetId) ?? presets[0];

  const openDialog = (mode: DialogMode) => {
    setDialog(mode);
    if (mode.kind === "create") setName("");
    if (mode.kind === "rename") setName(mode.preset.name);
    if (mode.kind === "duplicate") setName(`${mode.preset.name} (copy)`);
  };

  const closeDialog = () => setDialog({ kind: "idle" });

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (dialog.kind === "create") onCreate(trimmed);
    else if (dialog.kind === "rename") onRename(dialog.preset.id, trimmed);
    else if (dialog.kind === "duplicate")
      onDuplicate(dialog.preset.id, trimmed);
    closeDialog();
  };

  const confirmDelete = () => {
    if (dialog.kind !== "delete") return;
    onDelete(dialog.preset.id);
    closeDialog();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" disabled={disabled}>
              <span className="max-w-[14ch] truncate">
                {active?.name ?? t("none")}
              </span>
              {active?.isDefault ? (
                <StarIcon weight="fill" className="text-primary" />
              ) : null}
              <CaretDownIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("switchTo")}</DropdownMenuLabel>
            {presets.length <= 1 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {t("noOthers")}
              </div>
            ) : (
              presets.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="flex items-center gap-2"
                >
                  <CheckIcon
                    className={p.id === activePresetId ? "" : "invisible"}
                  />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.isDefault ? (
                    <StarIcon weight="fill" className="text-primary" />
                  ) : null}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openDialog({ kind: "create" })}>
            <PlusIcon /> {t("create")}
          </DropdownMenuItem>
          {active ? (
            <>
              <DropdownMenuItem
                onClick={() => openDialog({ kind: "rename", preset: active })}
              >
                <PencilIcon /> {t("rename")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  openDialog({ kind: "duplicate", preset: active })
                }
              >
                <CopyIcon /> {t("duplicate")}
              </DropdownMenuItem>
              {!active.isDefault ? (
                <DropdownMenuItem onClick={() => onSetDefault(active.id)}>
                  <StarIcon /> {t("setDefault")}
                </DropdownMenuItem>
              ) : null}
              {presets.length > 1 ? (
                <DropdownMenuItem
                  onClick={() => openDialog({ kind: "delete", preset: active })}
                  className="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                >
                  <TrashIcon /> {t("delete")}
                </DropdownMenuItem>
              ) : null}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={
          dialog.kind === "create" ||
          dialog.kind === "rename" ||
          dialog.kind === "duplicate"
        }
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.kind === "create"
                ? t("createTitle")
                : dialog.kind === "rename"
                  ? t("renameTitle")
                  : t("duplicateTitle")}
            </DialogTitle>
            <DialogDescription>{t("namePrompt")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="preset-name">{t("nameLabel")}</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t("cancel")}
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog.kind === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {dialog.kind === "delete"
                ? t("deletePrompt", { name: dialog.preset.name })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
