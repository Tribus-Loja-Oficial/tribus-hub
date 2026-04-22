import type { Metadata } from "next";
import { MilestoneDetailView } from "@/features/projects/components/milestone-detail-view";

export const metadata: Metadata = { title: "Milestone" };

export default function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; milestoneId: string }>;
}) {
  return <MilestoneDetailView paramsPromise={params} />;
}
