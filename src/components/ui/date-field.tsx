"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { inputControlClassName } from "@/components/ui/form-control-classes";

/**
 * Campo de data civil (`yyyy-MM-dd` no estado/API).
 *
 * Implementação **nativa visível** (`input type="date"`): o padrão anterior
 * (botão + `input` sr-only + `showPicker()`) quebrava de forma inconsistente
 * dentro de `Dialog` (Radix: foco, “outside pointer”, vários campos no mesmo modal).
 */
export interface DateFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  value?: string;
}

const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(
  ({ className, id, ...props }, ref) => {
    const autoId = React.useId();
    return (
      <input
        id={id ?? autoId}
        ref={ref}
        type="date"
        className={cn(
          inputControlClassName,
          "min-w-0 tabular-nums [color-scheme:light] dark:[color-scheme:dark]",
          className,
        )}
        {...props}
      />
    );
  },
);
DateField.displayName = "DateField";

export { DateField };
