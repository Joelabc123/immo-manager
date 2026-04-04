"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCurrency } from "@/lib/hooks/use-currency";

interface AreaChartDataPoint {
  [key: string]: string | number;
}

interface AreaConfig {
  key: string;
  label: string;
  color: string;
  strokeDasharray?: string;
}

interface AreaChartProps {
  data: AreaChartDataPoint[];
  areas: AreaConfig[];
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
}

export function AreaChart({
  data,
  areas,
  xAxisKey,
  height = 350,
  showGrid = true,
  showLegend = true,
  formatYAxis,
  formatTooltip,
}: AreaChartProps) {
  const { formatCompactCurrency } = useCurrency();
  const defaultFormatY = (value: number) => formatCompactCurrency(value);
  const defaultFormatTooltip = (value: number) => formatCompactCurrency(value);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        )}
        <XAxis
          dataKey={xAxisKey}
          className="text-xs text-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          className="text-xs text-muted-foreground"
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis ?? defaultFormatY}
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value, name) => [
            (formatTooltip ?? defaultFormatTooltip)(Number(value)),
            areas.find((a) => a.key === name)?.label ?? String(name),
          ]}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            formatter={(value: string) =>
              areas.find((a) => a.key === value)?.label ?? value
            }
          />
        )}
        {areas.map((area) => (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            stroke={area.color}
            fill={area.color}
            fillOpacity={0.1}
            strokeWidth={2}
            strokeDasharray={area.strokeDasharray}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
