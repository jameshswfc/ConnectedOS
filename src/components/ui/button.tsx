import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-brand-700 text-white shadow-sm hover:bg-brand-900 focus-visible:ring-gold-500",
        variant === "secondary" && "border border-brand-100 bg-white text-brand-900 hover:border-gold-500 hover:bg-gold-50",
        variant === "ghost" && "text-slate-700 hover:bg-brand-50 hover:text-brand-900",
        className
      )}
      {...props}
    />
  );
}
