"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  MapPin,
  Calendar,
  Ruler,
  Home,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordInput } from "@/components/ui/password-input";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params);
  const t = useTranslations("sharing");
  const tProp = useTranslations("properties");

  const [password, setPassword] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState<
    string | undefined
  >(undefined);

  const { data, isLoading, error } = trpc.shareLinks.verify.useQuery(
    { token, password: submittedPassword },
    {
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const passwordError = error?.data?.code === "UNAUTHORIZED";
  const isInvalidToken = error && !passwordError;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Invalid/expired token
  if (isInvalidToken) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">{t("invalidToken")}</h1>
      </div>
    );
  }

  // Password gate
  if (data?.requiresPassword || passwordError) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <CardTitle>{t("passwordRequired")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("enterPassword")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordError && (
              <p className="text-sm text-destructive">{t("invalidPassword")}</p>
            )}
            <PasswordInput
              placeholder={t("enterPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password) {
                  setSubmittedPassword(password);
                }
              }}
            />
            <Button
              className="w-full"
              onClick={() => setSubmittedPassword(password)}
              disabled={!password}
            >
              {t("sharedView")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.property) return null;

  const property = data.property;
  const address = [property.street, property.zipCode, property.city]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Badge variant="secondary" className="mb-2">
          {t("readOnly")}
        </Badge>
        <h1 className="text-2xl font-bold">{address || tProp("noAddress")}</h1>
        <p className="text-sm text-muted-foreground">
          {tProp(`types.${property.type}`)}
        </p>
      </div>

      {/* Thumbnail */}
      {property.thumbnailPath && (
        <Card className="mb-6 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic share-token image served via internal API route */}
          <img
            src={`/api/share/${token}`}
            alt={address}
            className="w-full h-64 object-cover"
          />
        </Card>
      )}

      {/* Property details */}
      <Card>
        <CardHeader>
          <CardTitle>{tProp("details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {address && (
            <DetailRow icon={MapPin} label={tProp("address")} value={address} />
          )}
          <DetailRow
            icon={Building2}
            label={tProp("type")}
            value={tProp(`types.${property.type}`)}
          />
          <DetailRow
            icon={Home}
            label={tProp("status")}
            value={tProp(`statuses.${property.status}`)}
          />
          {property.livingAreaSqm && (
            <DetailRow
              icon={Ruler}
              label={tProp("livingArea")}
              value={`${property.livingAreaSqm} m²`}
            />
          )}
          {property.landAreaSqm && (
            <DetailRow
              icon={Ruler}
              label={tProp("landArea")}
              value={`${property.landAreaSqm} m²`}
            />
          )}
          {property.constructionYear && (
            <DetailRow
              icon={Calendar}
              label={tProp("constructionYear")}
              value={String(property.constructionYear)}
            />
          )}
          {property.roomCount && (
            <DetailRow
              icon={Home}
              label={tProp("roomCount")}
              value={String(property.roomCount)}
            />
          )}
          {property.notes && (
            <div className="pt-3 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {tProp("notes")}
              </p>
              <p className="text-sm whitespace-pre-wrap">{property.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
