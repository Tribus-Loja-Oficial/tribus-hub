import type { Metadata } from "next";
import { KnowledgeListPage } from "@/features/knowledge/components/knowledge-list-page";

export const metadata: Metadata = { title: "Knowledge" };

export default function KnowledgePage() {
  return <KnowledgeListPage />;
}
