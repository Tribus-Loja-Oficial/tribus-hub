import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectDetailView } from "@/features/projects/components/project-detail-view";

export const metadata: Metadata = { title: "Projeto" };

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={null}>
      <ProjectDetailView paramsPromise={params} />
    </Suspense>
  );
}
