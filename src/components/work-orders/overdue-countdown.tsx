"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { getOverdueInfo, cn } from "@/lib/utils";

interface OverdueCountdownProps {
  dueDate: Date | string | null | undefined;
  status?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function OverdueCountdown({
  dueDate,
  status,
  className,
  size = "sm",
  showIcon = true,
}: OverdueCountdownProps) {
  const [, setTick] = useState(0);

  // Re-render every minute to keep countdown accurate
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const info = getOverdueInfo(dueDate, status);

  if (!info.isOverdue && !info.isDueSoon) return null;

  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  const iconSize = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" };

  if (info.isOverdue) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md font-semibold",
          "bg-red-900/60 text-red-300 border border-red-500/40",
          "animate-blink-overdue",
          sizeClasses[size],
          className
        )}
        title={`Overdue since ${new Date(dueDate!).toLocaleString()}`}
      >
        {showIcon && <AlertTriangle className={cn(iconSize[size], "text-red-400")} />}
        {info.overdueText}
      </span>
    );
  }

  // Due soon (within 24h)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium",
        "bg-amber-900/40 text-amber-300 border border-amber-500/30",
        sizeClasses[size],
        className
      )}
      title={`Due ${new Date(dueDate!).toLocaleString()}`}
    >
      {showIcon && <Clock className={cn(iconSize[size], "text-amber-400")} />}
      {info.dueInText}
    </span>
  );
}
