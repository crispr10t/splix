import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-ink-300 bg-white px-3.5 py-2 text-sm text-ink-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink-400 focus-visible:outline-none focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
