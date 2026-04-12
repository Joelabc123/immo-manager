"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCurrency } from "@/lib/hooks/use-currency";

interface BarChartDataPoint {
  [key: string]: string | number;
}

interface BarConfig {
  key: string;
  label: string;
  color: string;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  bars: BarConfig[];
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
}

export function BarChart({
  data,
  bars,
  xAxisKey,
  height = 250,
  showGrid = true,
  showLegend = false,
  formatYAxis,
  formatTooltip,
}: BarChartProps) {
  const { formatCompactCurrency } = useCurrency();
  const defaultFormatY = (value: number) => formatCompactCurrency(value);
  const defaultFormatTooltip = (value: number) => formatCompactCurrency(value);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
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
            bars.find((b) => b.key === name)?.label ?? String(name),
          ]}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            formatter={(value: string) =>
              bars.find((b) => b.key === value)?.label ?? value
            }
          />
        )}
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
