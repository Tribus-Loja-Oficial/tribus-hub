import type { Metadata } from "next";
import { WorkspaceCyclesPage } from "@/features/workspace/components/workspace-cycles-page";

export const metadata: Metadata = { title: "Workspace Cycles" };

export default function Page() {
  return <WorkspaceCyclesPage />;
}
