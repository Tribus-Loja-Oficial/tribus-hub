import type { Metadata } from "next";
import { PageDetailView } from "@/features/knowledge/components/page-detail-view";

export const metadata: Metadata = { title: "Página" };

export default function KnowledgePageDetail({ params }: { params: Promise<{ pageId: string }> }) {
  return <PageDetailView paramsPromise={params} />;
}
