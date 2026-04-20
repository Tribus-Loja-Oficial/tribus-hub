import type { Metadata } from "next";
import { ProjectDetailView } from "@/features/projects/components/project-detail-view";

export const metadata: Metadata = { title: "Projeto" };

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  return <ProjectDetailView paramsPromise={params} />;
}
