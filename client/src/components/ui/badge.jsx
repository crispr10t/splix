import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-leaf-600 text-white shadow-sm",
        secondary:
          "border-ink-200 bg-ink-100 text-ink-900",
        destructive:
          "border-transparent bg-danger-500 text-white shadow-sm",
        outline:
          "border-ink-200 text-ink-800 bg-white",
        success:
          "border-leaf-200 bg-leaf-50 text-leaf-800",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
