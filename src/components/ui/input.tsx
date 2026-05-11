import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-cyan-500 transition-colors pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              "block w-full rounded-xl border border-border-subtle px-4 py-3 text-sm text-text-primary",
              "bg-surface-hover placeholder:text-text-dim",
              "focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none focus:bg-surface-hover",
              "disabled:bg-surface-hover disabled:text-text-dim disabled:cursor-not-allowed",
              "transition-all duration-200 shadow-inner shadow-black/20",
              icon && "pl-11",
              error && "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/10",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 ml-1 text-xs text-rose-400 font-medium">{error}</p>}
        {!error && helperText && <p className="mt-1.5 ml-1 text-xs text-text-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
