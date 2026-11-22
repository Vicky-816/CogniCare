import * as React from "react";

import { cn } from "@/lib/utils";

// Form fields use the strong "input" border colour so the edge of every field
// is easy to see, a large font, and a tall box that is easy to tap.
export const fieldClassName =
  "min-h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg font-normal text-foreground placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-destructive";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldClassName, className)} {...props} />;
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(fieldClassName, className)} {...props} />;
}

export { Input, Select };
