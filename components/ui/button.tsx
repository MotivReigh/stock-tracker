import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-terminal-600 text-white hover:bg-terminal-700 focus-visible:ring-terminal-500",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 focus-visible:ring-slate-400",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:ring-slate-400",
  outline:
    "border border-app bg-transparent text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800 focus-visible:ring-slate-400",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5",
  icon: "h-9 w-9",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    />
  ),
);

Button.displayName = "Button";
