import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export const AVATAR_PALETTES = [
  "bg-emerald-100 text-emerald-800 border-emerald-200/80",
  "bg-sky-100 text-sky-800 border-sky-200/80",
  "bg-violet-100 text-violet-800 border-violet-200/80",
  "bg-amber-100 text-amber-800 border-amber-200/80",
  "bg-rose-100 text-rose-800 border-rose-200/80",
  "bg-indigo-100 text-indigo-800 border-indigo-200/80",
  "bg-teal-100 text-teal-800 border-teal-200/80",
  "bg-orange-100 text-orange-800 border-orange-200/80",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200/80",
  "bg-cyan-100 text-cyan-800 border-cyan-200/80"
];

/**
 * Returns a deterministic color scheme string for a given name.
 */
export function getAvatarColor(name = "") {
  const trimmed = (name || "").trim();
  if (!trimmed) return "bg-leaf-100 text-leaf-800 border-leaf-200/80";
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

/**
 * Standard 2-letter initial extractor:
 * - "Piyush" => "PI"
 * - "Piyush Gupta" => "PG"
 * - "A" => "A"
 */
export function getInitials(name = "") {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Universal UserAvatar component used consistently across Splix.
 */
export function UserAvatar({
  name = "",
  size = "md",
  className,
  showBorder = true,
  ...props
}) {
  const initials = getInitials(name);
  const colorClasses = getAvatarColor(name);

  const sizeClasses = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
    xl: "h-12 w-12 text-base"
  }[size] || "h-8 w-8 text-xs";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 rounded-full font-bold select-none uppercase tracking-tight transition-transform",
        showBorder && "border",
        colorClasses,
        sizeClasses,
        className
      )}
      aria-label={name ? `${name}'s avatar` : "User avatar"}
      {...props}
    >
      {initials}
    </div>
  );
}

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-leaf-500/20", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-leaf-100 font-semibold text-leaf-800 text-xs",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
