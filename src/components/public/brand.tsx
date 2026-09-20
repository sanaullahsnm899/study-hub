import Link from "next/link";
import { brand } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Wordmark({
  href = "/",
  className,
  size = "md",
}: {
  href?: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const content = (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span
        aria-hidden
        className={cn("text-[var(--accent)]", size === "sm" ? "text-[0.9rem]" : "text-[1.05rem]")}
      >
        {brand.mark}
      </span>
      <span
        className={cn(
          "font-serif tracking-[-0.015em] text-[var(--text)]",
          size === "sm" ? "text-[1.05rem]" : "text-[1.2rem]",
        )}
      >
        {brand.name}
      </span>
    </span>
  );
  if (!href) return content;
  return (
    <Link href={href} className="rounded transition-opacity hover:opacity-80" aria-label={`${brand.name} home`}>
      {content}
    </Link>
  );
}
