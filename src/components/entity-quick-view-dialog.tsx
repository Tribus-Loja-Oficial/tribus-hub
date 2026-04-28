"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickViewLeaveContext } from "@/components/quick-view-leave-context";
import { cn } from "@/lib/utils/cn";
import { ObjectiveDetailView } from "@/features/okr/components/objective-detail-view";
import { KeyResultDetailView } from "@/features/okr/components/key-result-detail-view";
import { ProjectDetailView } from "@/features/projects/components/project-detail-view";
import { MilestoneDetailView } from "@/features/projects/components/milestone-detail-view";
import { TaskDetailView } from "@/features/tasks/components/task-detail-view";

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
  const router = useRouter();
  const leaveApi = useMemo(
    () => ({
      leaveTo: (href: string) => {
        onOpenChange(false);
        router.push(href);
      },
    }),
    [onOpenChange, router],
  );

  function renderDetailContent() {
    if (!entity) return null;
    switch (entity.kind) {
      case "objective":
        return <ObjectiveDetailView objectiveId={entity.id} embedded />;
      case "keyResult":
        return <KeyResultDetailView keyResultId={entity.id} embedded />;
      case "project":
        return (
          <ProjectDetailView paramsPromise={Promise.resolve({ projectId: entity.id })} embedded />
        );
      case "milestone":
        return (
          <MilestoneDetailView
            paramsPromise={Promise.resolve({
              projectId: entity.projectId,
              milestoneId: entity.milestoneId,
            })}
            embedded
          />
        );
      case "task":
        return <TaskDetailView paramsPromise={Promise.resolve({ taskId: entity.id })} embedded />;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1200px] p-0">
        <QuickViewLeaveContext.Provider value={leaveApi}>
          <DialogHeader>
            <DialogTitle className="px-6 pt-6">
              {entity ? dialogTitle(entity) : "Detalhes"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[82vh] w-full min-w-0 overflow-y-auto px-4 pb-4">
            {renderDetailContent()}
          </div>
        </QuickViewLeaveContext.Provider>
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
