"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { TrendingUp } from "lucide-react";

export type ActivityDay = {
  /** "Pzt", "Sal", "Çar" … gibi kısa gün adı */
  label: string;
  /** O gün platforma eklenen analiz sayısı */
  reviews: number;
  /** O gün verilen puanların ortalaması (1-10) */
  avgRating: number;
};

// ─── Özel Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #262626",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <p style={{ color: "#737373", fontSize: 11, marginBottom: 8, fontWeight: 500 }}>
        {label}
      </p>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: "#e5e5e5", fontSize: 13 }}>
            {entry.dataKey === "reviews" ? "Analiz" : "Ort. Puan"}:{" "}
            <strong style={{ color: entry.color }}>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function ActivityChart({ data }: { data: ActivityDay[] }) {
  const totalReviews = data.reduce((s, d) => s + d.reviews, 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
      {/* Başlık */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--stadium-green-muted)]">
              <TrendingUp className="h-4 w-4 text-[var(--stadium-green)]" />
            </div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Haftalık Aktivite
            </h2>
          </div>
          <p className="mt-1 pl-10 text-xs text-[var(--muted)]">
            Son 7 gündeki analiz ve puan dağılımı
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-right">
          <div className="text-lg font-bold text-[var(--stadium-green)]">{totalReviews}</div>
          <div className="text-xs text-[var(--muted)]">toplam analiz</div>
        </div>
      </div>

      {/* Grafik */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#262626"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#737373", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#737373", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#262626", strokeWidth: 1 }} />
          <Legend
            wrapperStyle={{ paddingTop: 16 }}
            formatter={(value) => (
              <span style={{ color: "#737373", fontSize: 11 }}>
                {value === "reviews" ? "Analiz Sayısı" : "Ort. Puan (1-10)"}
              </span>
            )}
          />

          {/* Analiz Sayısı — Yeşil */}
          <Line
            type="monotone"
            dataKey="reviews"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ fill: "#22c55e", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#22c55e", stroke: "rgba(34,197,94,0.3)", strokeWidth: 6 }}
          />

          {/* Ort. Puan — Mavi kesikli */}
          <Line
            type="monotone"
            dataKey="avgRating"
            stroke="#60a5fa"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ fill: "#60a5fa", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#60a5fa", stroke: "rgba(96,165,250,0.3)", strokeWidth: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
