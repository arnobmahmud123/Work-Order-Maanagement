import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  onClick?: () => void;
  variant?: "glass" | "surface" | "outline";
}

export function Card({ 
  children, 
  className, 
  padding = true, 
  onClick,
  variant = "glass" 
}: CardProps) {
  const variants = {
    glass: "glass-card",
    surface: "surface-card",
    outline: "bg-transparent border border-border-subtle rounded-2xl"
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        variants[variant],
        padding && "p-6",
        onClick && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-5", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, size }: { children: React.ReactNode; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <h3 className={cn(
      "font-bold text-text-primary tracking-tight",
      size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg",
      className
    )}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm text-text-secondary mt-1", className)}>
      {children}
    </p>
  );
}
