import type { Metadata } from "next";
import { ProjectsListPage } from "@/features/projects/components/projects-list-page";

export const metadata: Metadata = { title: "Projetos" };

export default function ProjectsListRoute() {
  return <ProjectsListPage />;
}
