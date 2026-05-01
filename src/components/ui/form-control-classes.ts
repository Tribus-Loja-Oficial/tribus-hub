import { cn } from "@/lib/utils/cn";

/**
 * Superfície e foco consistentes para inputs nativos, selects e textareas.
 * Evita borda “azul forte” no foco e harmoniza com o modal (bordas neutras + anel suave).
 */
const surface =
  "rounded-md border border-border/85 bg-card/50 text-foreground shadow-inset transition-[border-color,box-shadow] duration-150";

const hover = "hover:border-muted-foreground/22";

const focusNeutral =
  "focus:border-border focus:outline-none focus:ring-2 focus:ring-foreground/[0.06] focus:ring-offset-0";

const focusVisibleNeutral =
  "focus-visible:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/[0.06] focus-visible:ring-offset-0";

const disabled = "disabled:cursor-not-allowed disabled:opacity-50";

/** Classe base alinhada ao componente `Input` (texto, URL, etc.) */
export const inputControlClassName = cn(
  surface,
  hover,
  focusVisibleNeutral,
  disabled,
  "flex h-9 w-full px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/75",
);

/** `<select>` nativo (altura padrão de formulário) */
export const nativeSelectClassName = cn(
  surface,
  hover,
  focusNeutral,
  disabled,
  "h-9 w-full appearance-none px-3 pr-8 text-sm",
);

/** `<select>` compacto (filtros, toolbars) */
export const nativeSelectSmClassName = cn(
  surface,
  hover,
  focusNeutral,
  disabled,
  "h-8 w-full appearance-none pl-2.5 pr-7 text-sm",
);

/** `<textarea>` nativo */
export const nativeTextareaClassName = cn(
  surface,
  hover,
  focusVisibleNeutral,
  disabled,
  "w-full min-h-[5.5rem] resize-y px-3 py-2 text-sm placeholder:text-muted-foreground/75",
);

/** Botão que simula campo (ex.: DateField) */
export const dateTriggerControlClassName = cn(
  surface,
  hover,
  "flex h-9 w-full items-center gap-2 px-3 text-left text-sm",
  focusVisibleNeutral,
  disabled,
);
