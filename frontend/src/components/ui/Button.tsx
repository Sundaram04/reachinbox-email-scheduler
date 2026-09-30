import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "soft" | "outline";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover rounded-field",
  soft: "bg-brand-soft text-ink hover:bg-brand-soft/70 rounded-field",
  outline: "border border-brand text-brand hover:bg-brand-soft rounded-full",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 px-4 text-row font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
