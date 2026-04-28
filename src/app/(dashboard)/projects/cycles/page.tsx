import type { Metadata } from "next";
import { ProjectsCyclesPage } from "@/features/projects/components/projects-cycles-page";

export const metadata: Metadata = { title: "Projetos · Ciclos" };

export default function ProjectsCyclesRoute() {
  return <ProjectsCyclesPage />;
}
