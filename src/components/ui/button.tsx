import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "emerald" | "amber";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, isLoading, children, disabled, ...props }, ref) => {
    const activeLoading = loading || isLoading;
    const base =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none";

    const variants = {
      primary: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] border border-cyan-400/20",
      secondary: "bg-surface-hover text-text-primary hover:bg-surface-hover border border-border-subtle hover:border-border-subtle",
      outline: "border border-border-subtle bg-transparent text-text-secondary hover:bg-surface-hover hover:border-border-subtle",
      ghost: "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
      danger: "bg-gradient-to-r from-rose-600 to-red-700 text-white hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] border border-rose-400/20",
      emerald: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/20",
      amber: "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-400/20",
    };

    const sizes = {
      xs: "text-[11px] px-2.5 py-1 gap-1",
      sm: "text-xs px-3.5 py-2 gap-1.5",
      md: "text-sm px-5 py-2.5 gap-2",
      lg: "text-base px-7 py-3.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || activeLoading}
        {...props}
      >
        {activeLoading ? (
          <div className="mr-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps };
