"use client";

import { useState } from "react";
import { CircleHelp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PageGuideProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function PageGuide({ title, defaultOpen = false, children }: PageGuideProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border/80 bg-card/40 shadow-sm overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <CircleHelp className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="font-medium text-foreground">{title}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="border-t border-border/70 px-3.5 pb-3.5 pt-3 text-xs text-muted-foreground leading-relaxed space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function GuideSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {title && <p className="font-semibold text-foreground">{title}</p>}
      {children}
    </div>
  );
}

export function GuideList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-4 space-y-1 marker:text-muted-foreground/80">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export function GuideExamples({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/85">Exemplos</p>
      <div className="space-y-2 text-[13px] leading-snug">{children}</div>
    </div>
  );
}
