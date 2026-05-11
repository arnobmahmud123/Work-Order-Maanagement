"use client";

import { cn } from "@/lib/utils";

// ─── Donut Chart ─────────────────────────────────────────────────────────────

export function DonutChart({
  data,
  size = 140,
  thickness = 20,
  className,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className={cn("flex items-center justify-center gap-8", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
          {data.map((item, i) => {
            const pct = item.value / total;
            const offset = circumference * accumulated;
            const length = circumference * pct;
            accumulated += pct;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={thickness}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-text-primary">{total}</span>
          <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {data.map((item, i) => {
          const pct = ((item.value / total) * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center gap-3 group cursor-default">
              <div
                className="h-2 w-2 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                style={{ backgroundColor: item.color, color: item.color }}
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-text-secondary group-hover:text-text-primary transition-colors uppercase tracking-wider">
                  {item.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-text-primary">{item.value}</span>
                  <span className="text-[9px] font-medium text-text-dim">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

export function BarChart({
  data,
  height = 120,
  className,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const colors = [
    "from-cyan-500 to-blue-600",
    "from-purple-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-red-600",
    "from-blue-500 to-indigo-600",
  ];

  return (
    <div className={cn("flex items-end gap-3", className)} style={{ height: height + 40 }}>
      {data.map((item, i) => {
        const barH = (item.value / max) * height;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative w-full flex flex-col items-center">
              <span className="text-[10px] font-black text-text-secondary group-hover:text-cyan-400 transition-colors mb-1">
                {item.value}
              </span>
              <div
                className={cn(
                  "w-full rounded-xl bg-gradient-to-t transition-all duration-1000 ease-out shadow-lg",
                  item.color || colors[i % colors.length]
                )}
                style={{ height: barH || 4 }}
              >
                <div className="w-full h-full bg-surface-hover opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-[9px] font-bold text-text-dim text-center uppercase tracking-tighter leading-tight h-8 flex items-center">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#06b6d4",
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${height} ${points} ${width - padding},${height}`;

  return (
    <svg width={width} height={height} className={cn("flex-shrink-0 overflow-visible", className)}>
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${areaPoints.replace(/,/g, " ").split(" ").map((v, i) => i % 2 === 0 ? v : v).join(" ")}`}
        fill={`url(#spark-${color.replace("#", "")})`}
        className="opacity-50"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]"
      />
    </svg>
  );
}

// ─── Progress Ring ───────────────────────────────────────────────────────────

export function ProgressRing({
  value,
  size = 64,
  thickness = 6,
  color = "#06b6d4",
  bgColor = "rgba(255,255,255,0.03)",
  className,
  children,
}: {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  bgColor?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out shadow-glow"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

// ─── Horizontal Bar ──────────────────────────────────────────────────────────

export function HorizontalBar({
  label,
  value,
  maxValue,
  color = "from-cyan-500 to-blue-600",
  suffix = "",
  className,
}: {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  suffix?: string;
  className?: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black text-text-primary tabular-nums">
          {value}{suffix}
        </span>
      </div>
      <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden border border-border-subtle shadow-inner">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Stat Card with Sparkline ────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
  sparkData,
  href,
}: {
  label: string;
  value: string | number;
  change?: number;
  icon: any;
  color: string;
  sparkData?: number[];
  href?: string;
}) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className={cn(
      "glass-card p-5 group transition-premium relative overflow-hidden",
      href && "cursor-pointer"
    )}>
      <div className="flex items-start justify-between relative z-10">
        <div className={cn("p-2.5 rounded-xl border border-border-subtle shadow-sm group-hover:scale-110 transition-transform duration-300", color)}>
          <Icon className="h-5 w-5" />
        </div>
        {sparkData && (
          <Sparkline 
            data={sparkData} 
            width={70} 
            height={24} 
            color={color.includes("cyan") ? "#06b6d4" : color.includes("purple") ? "#a855f7" : color.includes("emerald") ? "#10b981" : color.includes("rose") ? "#f43f5e" : "#3b82f6"} 
          />
        )}
      </div>
      
      <div className="mt-4 relative z-10">
        <p className="text-3xl font-black text-text-primary tracking-tight tabular-nums group-hover:text-cyan-400 transition-colors duration-300">{value}</p>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1">{label}</p>
      </div>

      {change !== undefined && (
        <div className="mt-4 flex items-center gap-2 relative z-10">
          <div className={cn(
            "flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tighter",
            isPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          )}>
            {isPositive ? "↑" : "↓"} {Math.abs(change)}%
          </div>
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Growth</span>
        </div>
      )}

      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}
