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

    function openPicker() {
      if (disabled) return;
      const el = innerRef.current;
      if (!el) return;
      try {
        el.showPicker();
      } catch {
        el.focus();
        el.click();
      }
    }

    return (
      <div className={cn("relative w-full", className)}>
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
          tabIndex={-1}
          className="sr-only"
          {...props}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={display ? `Data: ${display}` : "Abrir calendário"}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              openPicker();
            }
          }}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm transition-colors",
            "hover:border-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            disabled && "pointer-events-none cursor-not-allowed opacity-50",
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate tabular-nums text-foreground",
              !display && "text-muted-foreground",
            )}
          >
            {display || "dd/mm/aaaa"}
          </span>
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </div>
    );
  },
);
DateField.displayName = "DateField";

export { DateField };
