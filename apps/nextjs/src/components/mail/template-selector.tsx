"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText } from "lucide-react";

interface TemplateSelectorProps {
  onSelect: (template: { subject: string; body: string }) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const t = useTranslations("email");
  const { data: templates } = trpc.email.listTemplates.useQuery();

  if (!templates?.length) return null;

  return (
    <div className="flex items-center gap-2">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <Select
        onValueChange={(value) => {
          if (!value) return;
          const tmpl = templates.find((tp) => tp.id === value);
          if (tmpl) {
            onSelect({ subject: tmpl.subject, body: tmpl.body });
          }
        }}
      >
        <SelectTrigger className="h-8 w-48">
          <SelectValue placeholder={t("templates.select")} />
        </SelectTrigger>
        <SelectContent>
          {templates.map((tmpl) => (
            <SelectItem key={tmpl.id} value={tmpl.id}>
              {tmpl.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
