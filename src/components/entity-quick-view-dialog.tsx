"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

export type QuickViewEntity =
  | { kind: "objective"; id: string }
  | { kind: "keyResult"; id: string }
  | { kind: "project"; id: string }
  | { kind: "milestone"; projectId: string; milestoneId: string }
  | { kind: "task"; id: string };

export function entityDetailHref(e: QuickViewEntity): string {
  switch (e.kind) {
    case "objective":
      return `/okr/objectives/${encodeURIComponent(e.id)}`;
    case "keyResult":
      return `/okr/key-results/${encodeURIComponent(e.id)}`;
    case "project":
      return `/projects/${encodeURIComponent(e.id)}`;
    case "milestone":
      return `/projects/${encodeURIComponent(e.projectId)}/milestones/${encodeURIComponent(e.milestoneId)}`;
    case "task":
      return `/tasks/${encodeURIComponent(e.id)}`;
  }
}

function dialogTitle(e: QuickViewEntity): string {
  switch (e.kind) {
    case "objective":
      return "Objetivo OKR";
    case "keyResult":
      return "Key result";
    case "project":
      return "Projeto";
    case "milestone":
      return "Milestone";
    case "task":
      return "Task";
  }
}

export function EntityQuickViewDialog({
  entity,
  open,
  onOpenChange,
}: {
  entity: QuickViewEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1200px] p-0">
        <DialogHeader>
          <DialogTitle className="px-6 pt-6">
            {entity ? dialogTitle(entity) : "Detalhes"}
          </DialogTitle>
        </DialogHeader>
        {entity ? (
          <div className="px-4 pb-4">
            <iframe
              title={`Detalhes: ${dialogTitle(entity)}`}
              src={entityDetailHref(entity)}
              className="h-[82vh] w-full rounded-lg border border-border bg-background"
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function EntityQuickViewEyeButton({
  entity,
  className,
  title = "Ver detalhes",
}: {
  entity: QuickViewEntity;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground", className)}
        title={title}
        aria-label={title}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <EntityQuickViewDialog entity={entity} open={open} onOpenChange={setOpen} />
    </>
  );
}
