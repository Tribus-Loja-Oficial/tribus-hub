"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { parseCivilDateInput } from "@/lib/date/civil-date";
import { cn } from "@/lib/utils/cn";
import { dateTriggerControlClassName } from "@/components/ui/form-control-classes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DateFieldProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "value" | "onChange"
> {
  /** yyyy-MM-dd */
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** yyyy-MM-dd (civil) — limite inferior do mini-calendário */
  min?: string;
  /** yyyy-MM-dd (civil) — limite superior do mini-calendário */
  max?: string;
  required?: boolean;
}

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function isDayDisabled(ymd: string, min?: string, max?: string): boolean {
  if (min && ymd < min) return true;
  if (max && ymd > max) return true;
  return false;
}

function emitChange(onChange: DateFieldProps["onChange"] | undefined, value: string): void {
  if (!onChange) return;
  onChange({
    target: { value },
    currentTarget: { value },
  } as React.ChangeEvent<HTMLInputElement>);
}

function CivilMiniCalendar({
  value,
  min,
  max,
  monthCursor,
  onMonthCursor,
  onPick,
}: {
  value?: string;
  min?: string;
  max?: string;
  monthCursor: Date;
  onMonthCursor: (d: Date) => void;
  onPick: (ymd: string) => void;
}) {
  const monthStart = startOfMonth(monthCursor);
  const monthEnd = endOfMonth(monthCursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const selected = value ? parseCivilDateInput(value) : null;

  const weekLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="w-[min(100vw-2rem,18.5rem)] select-none p-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          aria-label="Mês anterior"
          onClick={() => onMonthCursor(subMonths(monthCursor, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-medium capitalize text-foreground">
          {format(monthCursor, "LLLL yyyy", { locale: ptBR })}
        </span>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          aria-label="Próximo mês"
          onClick={() => onMonthCursor(addMonths(monthCursor, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {weekLabels.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const ymd = toYmd(day);
          const outside = !isSameMonth(day, monthCursor);
          const disabled = isDayDisabled(ymd, min, max);
          const sel = selected && isValid(selected) && isSameDay(day, selected);
          const today = isToday(day);
          return (
            <button
              key={ymd}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onPick(ymd);
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                outside && "text-muted-foreground/45",
                !outside && !disabled && "text-foreground hover:bg-muted/80",
                disabled && "cursor-not-allowed opacity-30",
                today &&
                  !sel &&
                  !disabled &&
                  "bg-primary/[0.08] font-medium ring-1 ring-primary/45",
                sel &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DateField = React.forwardRef<HTMLButtonElement, DateFieldProps>(
  ({ className, value, onChange, disabled, id, name, min, max, required, ...props }, ref) => {
    const autoId = React.useId();
    const fieldId = id ?? autoId;
    const [open, setOpen] = React.useState(false);
    const [monthCursor, setMonthCursor] = React.useState(() =>
      startOfMonth(parseCivilDateInput(value ?? "") ?? new Date()),
    );

    React.useEffect(() => {
      if (!open) return;
      const base = parseCivilDateInput(value ?? "");
      setMonthCursor(startOfMonth(base && isValid(base) ? base : new Date()));
    }, [open, value]);

    const display =
      value && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? (() => {
            const d = parseCivilDateInput(value);
            return d && isValid(d) ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "";
          })()
        : "";

    return (
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={fieldId}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-required={required}
            data-date-field="true"
            name={name}
            ref={ref}
            className={cn(dateTriggerControlClassName, className)}
            {...props}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left tabular-nums text-foreground",
                !display && "text-muted-foreground",
              )}
            >
              {display || "dd/mm/aaaa"}
            </span>
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <CivilMiniCalendar
            value={value}
            min={min}
            max={max}
            monthCursor={monthCursor}
            onMonthCursor={setMonthCursor}
            onPick={(ymd) => {
              emitChange(onChange, ymd);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DateField.displayName = "DateField";

export { DateField };
