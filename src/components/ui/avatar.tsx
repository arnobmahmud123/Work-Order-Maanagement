import { useState, useEffect } from "react";
import { cn, getInitials } from "@/lib/utils";

type UserStatus = "online" | "away" | "busy" | "offline" | null;

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  status?: UserStatus;
  showStatus?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  busy: "bg-red-500",
  offline: "bg-gray-500",
};

const STATUS_SIZES: Record<string, string> = {
  xs: "h-2 w-2 border",
  sm: "h-2.5 w-2.5 border-[1.5px]",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-2",
};

export function Avatar({
  src,
  name,
  size = "md",
  className,
  status,
  showStatus = false,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const statusDot = showStatus && status ? (
    <div
      className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full border-border-subtle",
        STATUS_COLORS[status] || STATUS_COLORS.offline,
        STATUS_SIZES[size]
      )}
    />
  ) : null;

  if (src && !hasError) {
    return (
      <div className={cn("relative flex-shrink-0", className)}>
        <img
          src={src}
          alt={name || "User"}
          onError={() => setHasError(true)}
          className={cn(
            "rounded-full object-cover ring-2 ring-white/[0.1]",
            sizes[size]
          )}
        />
        {statusDot}
      </div>
    );
  }

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div
        className={cn(
          "rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white font-medium flex items-center justify-center ring-2 ring-white/[0.1]",
          sizes[size]
        )}
      >
        {getInitials(name)}
      </div>
      {statusDot}
    </div>
  );
}
