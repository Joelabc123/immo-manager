"use client";

import { useTranslations } from "next-intl";
import { Building2, MapPin, Calendar, Ruler, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/lib/hooks/use-currency";

interface PropertyTag {
  id: string;
  name: string;
  color: string | null;
}

interface PropertyCardProps {
  property: {
    id: string;
    type: string;
    status: string;
    street: string | null;
    city: string | null;
    zipCode: string | null;
    livingAreaSqm: number;
    purchasePrice: number;
    purchaseDate: string;
    marketValue: number | null;
    thumbnailPath: string | null;
    unitCount: number;
    tags: PropertyTag[];
  };
  onClick: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  rented:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  vacant: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  owner_occupied:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fix_flip:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  renovation:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  sale_planned:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export function PropertyCard({
  property,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
}: PropertyCardProps) {
  const t = useTranslations("properties");
  const { formatCurrency } = useCurrency();
  const address = [property.street, property.zipCode, property.city]
    .filter(Boolean)
    .join(", ");

  const thumbnailUrl = property.thumbnailPath
    ? `/api/uploads/${property.thumbnailPath}`
    : null;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(property.id)}
    >
      {/* Thumbnail */}
      <div className="relative h-40 w-full overflow-hidden rounded-t-xl bg-muted">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded property thumbnail
          <img
            src={thumbnailUrl}
            alt={address || t("property")}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Building2 className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[property.status] ?? "bg-gray-100 text-gray-800"}`}
          >
            {t(`status.${property.status}`)}
          </span>
        </div>
      </div>

      <CardContent className="space-y-3">
        {/* Address */}
        <div>
          <h3 className="font-medium leading-tight">
            {address || t("noAddress")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t(`types.${property.type}`)}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Ruler className="h-3.5 w-3.5" />
            <span>{property.livingAreaSqm} m²</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(property.purchaseDate).getFullYear()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{formatCurrency(property.purchasePrice)}</span>
          </div>
          {property.marketValue && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{formatCurrency(property.marketValue)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {property.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {property.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-1">
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(property.id);
            }}
          >
            {t("edit")}
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(property.id);
            }}
          >
            {t("duplicate")}
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            className="text-xs text-destructive hover:text-destructive/80"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(property.id);
            }}
          >
            {t("deleteAction")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
