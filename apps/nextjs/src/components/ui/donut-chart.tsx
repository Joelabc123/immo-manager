"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Label,
} from "recharts";

interface DonutChartDataPoint {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartDataPoint[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  showLegend?: boolean;
  formatTooltip?: (value: number) => string;
  onSegmentClick?: (entry: DonutChartDataPoint) => void;
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  height = 300,
  showLegend = true,
  formatTooltip,
  onSegmentClick,
}: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          dataKey="value"
          nameKey="name"
          paddingAngle={2}
          onClick={(entry) => {
            if (onSegmentClick) {
              onSegmentClick(entry as unknown as DonutChartDataPoint);
            }
          }}
          style={{ cursor: onSegmentClick ? "pointer" : "default" }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          {centerValue && centerLabel && (
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        dy="-0.4em"
                        className="fill-foreground text-2xl font-bold"
                      >
                        {centerValue}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        dy="1.4em"
                        className="fill-muted-foreground text-xs"
                      >
                        {centerLabel}
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          )}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => [
            formatTooltip ? formatTooltip(Number(value)) : String(value),
          ]}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            layout="vertical"
            align="right"
            verticalAlign="middle"
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
