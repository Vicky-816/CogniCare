import { cn } from "@/lib/utils";

// Until photos arrive (Part R3), each person gets a coloured circle with their
// first letter. The colour is picked from the name, so it stays the same.
const COLORS = ["bg-memory text-white", "bg-sequence text-white", "bg-pattern text-white", "bg-routine text-white"];
const SIZES = {
  md: "size-14 text-2xl",
  lg: "size-20 text-4xl sm:size-24 sm:text-5xl",
  xl: "size-32 text-6xl",
};

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  const color = COLORS[Array.from(name).reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0) % COLORS.length];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display font-bold",
        SIZES[size],
        color,
        className,
      )}
    >
      {initial}
    </span>
  );
}
