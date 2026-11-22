import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// Buttons are game "tiles": chunky, with a lip underneath that squashes when
// pressed. Every size is at least 48px tall, text is large, the focus ring is
// thick, and labels may wrap instead of overflowing when the user zooms in.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl text-center font-semibold outline-none select-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
  {
    variants: {
      variant: {
        // The main action on a screen.
        default: "tile bg-primary text-primary-foreground [--lip:#050b1c] hover:bg-[#1f3159]",
        // A friendly highlight, used sparingly (for example "Start playing").
        accent: "tile bg-accent text-accent-foreground [--lip:#a37700] hover:bg-[#ffc61a]",
        // A second choice that sits next to a main action.
        outline: "tile border-2 border-primary bg-card text-primary [--lip:#9aa4bb] hover:bg-secondary",
        destructive: "tile bg-destructive text-destructive-foreground [--lip:#6e150d] hover:bg-destructive/90",
        // Flat, quiet buttons for small actions.
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-muted",
        link: "text-primary underline underline-offset-4 hover:decoration-2",
      },
      size: {
        default: "min-h-14 px-6 py-2 text-lg has-[>svg]:px-5",
        sm: "min-h-12 px-4 py-1.5 text-base has-[>svg]:px-3",
        lg: "min-h-16 px-8 py-3 text-xl has-[>svg]:px-7",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
