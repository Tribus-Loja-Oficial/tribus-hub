"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DateFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  /** yyyy-MM-dd */
  value?: string;
}

const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(
  ({ className, value, onChange, disabled, id, name, min, max, required, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    const autoId = React.useId();
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    const display =
      value && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? (() => {
            const d = parseISO(value);
            return isValid(d) ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "";
          })()
        : "";

    const fieldId = id ?? autoId;

    return (
      <div
        className={cn(
          "relative flex h-9 w-full rounded-md border border-input bg-background text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring hover:border-muted-foreground/25",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          className,
        )}
      >
        <input
          id={fieldId}
          name={name}
          ref={innerRef}
          type="date"
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          min={min}
          max={max}
          required={required}
          className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
          title={display || undefined}
          {...props}
        />
        <div className="pointer-events-none relative z-0 flex h-full min-h-9 w-full min-w-0 items-center gap-2 px-3">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left tabular-nums text-foreground",
              !display && "text-muted-foreground",
            )}
          >
            {display || "dd/mm/aaaa"}
          </span>
          <Calendar className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </div>
    );
  },
);
DateField.displayName = "DateField";

export { DateField };
