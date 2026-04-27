import type { Metadata } from "next";
import { PmDashboardPage } from "@/features/projects/components/pm-dashboard-page";

export const metadata: Metadata = { title: "Projetos · Ciclos" };

export default function ProjectsCyclesPage() {
  return <PmDashboardPage />;
}
