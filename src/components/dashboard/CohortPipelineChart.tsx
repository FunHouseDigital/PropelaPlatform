"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface PipelineData {
  stage: string;
  count: number;
}

interface CohortPipelineChartProps {
  data: PipelineData[];
}

const BAR_COLORS = [
  "#5B2D8E",
  "#7B4BAE",
  "#9B6BC8",
  "#B98DE0",
  "#D4B5F0",
  "#E8D5F7",
  "#3D1D5E",
  "#6B3FA0",
];

export function CohortPipelineChart({ data }: CohortPipelineChartProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Pipeline Overview
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6B7280" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
