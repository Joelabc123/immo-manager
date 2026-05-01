"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export interface RecipientSelection {
  email: string;
  label?: string;
  tenantId?: string | null;
  propertyId?: string | null;
}

interface RecipientPickerProps {
  label: string;
  value: RecipientSelection[];
  onChange: (next: RecipientSelection[]) => void;
  placeholder: string;
  addLabel: string;
  tenantDropdownLabel: string;
  className?: string;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function RecipientPicker({
  label,
  value,
  onChange,
  placeholder,
  addLabel,
  tenantDropdownLabel,
  className,
}: RecipientPickerProps) {
  const [inputValue, setInputValue] = useState("");
  const { data: recipients } = trpc.tenants.emailRecipients.useQuery();

  const addRecipient = (recipient: RecipientSelection) => {
    if (value.some((item) => item.email === recipient.email)) return;
    onChange([...value, recipient]);
  };

  const removeRecipient = (email: string) => {
    onChange(value.filter((item) => item.email !== email));
  };

  const addFreeRecipient = () => {
    const email = inputValue.trim();
    if (!isValidEmail(email)) return;
    addRecipient({ email, label: email });
    setInputValue("");
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-2 rounded-md border bg-background p-2">
        {value.map((recipient) => (
          <Badge key={recipient.email} variant="secondary" className="gap-1">
            <span>{recipient.label ?? recipient.email}</span>
            <button
              type="button"
              className="rounded-full hover:text-destructive"
              onClick={() => removeRecipient(recipient.email)}
              aria-label={`Remove ${recipient.email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <div className="flex min-w-56 flex-1 items-center gap-2">
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addFreeRecipient();
              }
            }}
            placeholder={placeholder}
            className="h-8 border-0 px-1 shadow-none focus-visible:ring-0"
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={addFreeRecipient}
            disabled={!isValidEmail(inputValue.trim())}
            title={addLabel}
            aria-label={addLabel}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
            />
          }
        >
          {tenantDropdownLabel}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-80 w-96 overflow-auto p-2"
        >
          <div className="flex flex-col gap-1">
            {(recipients ?? []).map((recipient) => {
              const selected = value.some(
                (item) => item.email === recipient.email,
              );
              return (
                <button
                  key={`${recipient.tenantId}:${recipient.email}`}
                  type="button"
                  className={cn(
                    "rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                    selected && "bg-muted",
                  )}
                  onClick={() =>
                    addRecipient({
                      email: recipient.email,
                      label: `${recipient.tenantName} <${recipient.email}>`,
                      tenantId: recipient.tenantId,
                      propertyId: recipient.propertyId,
                    })
                  }
                >
                  <div className="font-medium">{recipient.tenantName}</div>
                  <div className="text-xs text-muted-foreground">
                    {recipient.email}
                    {recipient.propertyAddress
                      ? ` · ${recipient.propertyAddress}`
                      : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
