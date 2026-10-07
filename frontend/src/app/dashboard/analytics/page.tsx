"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type Analytics, type Period, PERIODS, useAnalytics } from "@/lib/analytics";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

// Categorical slots 1-2 of the reference palette (validated: CVD ΔE 24.7, all >= 3:1 on light)
const SERIES = [
  { key: "views", label: "Просмотры", color: "#2a78d6" },
  { key: "unique_visitors", label: "Уникальные посетители", color: "#eb6834" },
] as const;

const DEVICE_LABELS: Record<string, string> = { desktop: "Компьютер", mobile: "Телефон", tablet: "Планшет" };

const number = new Intl.NumberFormat("ru-RU");
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

export default function AnalyticsPage() {
  const [days, setDays] = useState<Period>(30);
  const { data, isPending } = useAnalytics(days);

  return (
    <>
      <PageHeader title="Аналитика" description="Кто смотрит вашу страницу и по каким ссылкам переходит" />

      {/* Filters: one row above everything they scope */}
      <div className="mb-6 flex gap-1 rounded-lg border p-1 w-fit" role="radiogroup" aria-label="Период">
        {PERIODS.map((period) => (
          <Button
            key={period}
            size="sm"
            variant={days === period ? "default" : "ghost"}
            role="radio"
            aria-checked={days === period}
            onClick={() => setDays(period)}
          >
            {period} дней
          </Button>
        ))}
      </div>

      {isPending || !data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Просмотры" value={number.format(data.totals.views)} />
            <StatTile label="Уникальные посетители" value={number.format(data.totals.unique_visitors)} />
            <StatTile label="Клики по ссылкам" value={number.format(data.totals.clicks)} />
            <StatTile
              label="CTR"
              value={`${(data.totals.ctr * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`}
              hint="клики / просмотры"
            />
          </div>

          {data.totals.views === 0 && data.totals.clicks === 0 ? <EmptyState /> : <DailyChart data={data} />}

          <div className="grid gap-8 lg:grid-cols-3">
            <BarList
              title="Популярные ссылки"
              unit="кликов"
              rows={data.top_links.map((l) => ({ label: l.title, value: l.clicks }))}
            />
            <BarList
              title="Источники"
              unit="просмотров"
              rows={data.referrers.map((r) => ({ label: r.host || "Прямые заходы", value: r.views }))}
            />
            <BarList
              title="Устройства"
              unit="просмотров"
              rows={data.devices.map((d) => ({ label: DEVICE_LABELS[d.device] ?? d.device, value: d.views }))}
            />
          </div>
        </div>
      )}
    </>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EmptyState() {
  const { data: me } = useMe();
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">Пока нет данных за этот период</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Поделитесь ссылкой на свою страницу — просмотры и клики появятся здесь. Ваши собственные заходы не
        считаются.
      </p>
      {me && (
        <Link href={`/@${me.username}`} target="_blank" className="mt-3 inline-block font-mono text-sm underline">
          myhub.site/@{me.username}
        </Link>
      )}
    </div>
  );
}

function DailyChart({ data }: { data: Analytics }) {
  const [asTable, setAsTable] = useState(false);
  const rows = data.daily.map((d) => ({ ...d, label: dayLabel(d.date) }));

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">По дням</h2>
        <div className="flex items-center gap-4">
          {/* Legend: line keys, mirroring the marks */}
          <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {SERIES.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label}
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? "График" : "Таблица"}
          </Button>
        </div>
      </div>

      {asTable ? (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background text-left text-muted-foreground">
              <tr>
                <th className="py-2 font-normal">Дата</th>
                <th className="py-2 text-right font-normal">Просмотры</th>
                <th className="py-2 text-right font-normal">Уникальные</th>
                <th className="py-2 text-right font-normal">Клики</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...rows].reverse().map((row) => (
                <tr key={row.date} className="border-t">
                  <td className="py-1.5">{row.label}</td>
                  <td className="py-1.5 text-right">{row.views}</td>
                  <td className="py-1.5 text-right">{row.unique_visitors}</td>
                  <td className="py-1.5 text-right">{row.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72" role="img" aria-label="График просмотров и уникальных посетителей по дням">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                content={ChartTooltip}
                cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  type="monotone"
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function ChartTooltip({ active, payload, label }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      {payload.map((item) => (
        <div key={String(item.dataKey)} className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded-full" style={{ background: item.color }} aria-hidden />
          <span className="font-semibold tabular-nums">{item.value}</span>
          <span className="text-muted-foreground">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

/** Magnitude per category: one hue, value labels always visible (no hover needed to read them). */
function BarList({ title, unit, rows }: { title: string; unit: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section>
      <h2 className="mb-3 font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет данных</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.label} title={`${row.label}: ${row.value} ${unit}`} className="relative">
              <div
                className={cn("absolute inset-y-0 left-0 rounded-sm bg-[#cde2fb]")}
                style={{ width: `${(row.value / max) * 100}%` }}
                aria-hidden
              />
              <div className="relative flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
                <span className="truncate">{row.label}</span>
                <span className="font-medium tabular-nums">{number.format(row.value)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
