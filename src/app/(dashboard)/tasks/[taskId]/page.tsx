import type { Metadata } from "next";
import { TaskDetailView } from "@/features/tasks/components/task-detail-view";

export const metadata: Metadata = { title: "Task" };

export default function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  return <TaskDetailView paramsPromise={params} />;
}
