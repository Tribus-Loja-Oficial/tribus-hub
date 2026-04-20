import type { Metadata } from "next";
import { PmDashboardPage } from "@/features/projects/components/pm-dashboard-page";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <PmDashboardPage />;
}
