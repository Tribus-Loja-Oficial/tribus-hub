import type { Metadata } from "next";
import { Suspense } from "react";
import { TaskBoardPage } from "@/features/tasks/components/task-board-page";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-muted/50" />}>
      <TaskBoardPage />
    </Suspense>
  );
}
