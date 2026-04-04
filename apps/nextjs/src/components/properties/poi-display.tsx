"use client";

import { useTranslations } from "next-intl";
import {
  Utensils,
  ShoppingCart,
  Stethoscope,
  Baby,
  Pill,
  GraduationCap,
  Bus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Poi {
  category: string;
  name: string;
  distance: number;
}

interface PoiDisplayProps {
  pois: Poi[];
  score: number;
  isManual: boolean;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  restaurant: Utensils,
  supermarket: ShoppingCart,
  doctor: Stethoscope,
  kindergarten: Baby,
  pharmacy: Pill,
  school: GraduationCap,
  public_transport: Bus,
};

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "text-orange-500",
  supermarket: "text-green-500",
  doctor: "text-blue-500",
  kindergarten: "text-pink-500",
  pharmacy: "text-red-500",
  school: "text-indigo-500",
  public_transport: "text-yellow-600",
};

function getScoreColor(score: number): string {
  if (score >= 70)
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 40)
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
}

export function PoiDisplay({ pois, score, isManual }: PoiDisplayProps) {
  const t = useTranslations("properties.poi");

  // Group POIs by category
  const grouped = new Map<string, Poi[]>();
  for (const poi of pois) {
    const existing = grouped.get(poi.category) ?? [];
    existing.push(poi);
    grouped.set(poi.category, existing);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${getScoreColor(score)}`}
            >
              {score}/100
            </span>
            {isManual && (
              <Badge variant="outline" className="text-xs">
                {t("manual")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pois.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPois")}</p>
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([category, items]) => {
              const Icon = CATEGORY_ICONS[category] ?? ShoppingCart;
              const colorClass = CATEGORY_COLORS[category] ?? "text-gray-500";

              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <span className="text-sm font-medium">
                      {t(`categories.${category}`)}
                    </span>
                  </div>
                  <div className="ml-6 space-y-0.5">
                    {items.slice(0, 3).map((poi, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm text-muted-foreground"
                      >
                        <span className="truncate">{poi.name}</span>
                        <span className="ml-2 shrink-0">{poi.distance}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
