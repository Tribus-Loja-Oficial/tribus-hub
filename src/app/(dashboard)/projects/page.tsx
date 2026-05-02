import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = { title: "Projects" };

/** Code-split do dashboard PM (muitas queries/UI) para acelerar primeira navegação. */
const PmDashboardPage = dynamic(
  () =>
    import("@/features/projects/components/pm-dashboard-page").then((m) => ({
      default: m.PmDashboardPage,
    })),
  {
    loading: () => <div className="h-32 animate-pulse rounded-xl bg-muted/50" aria-hidden />,
  },
);

export default function ProjectsPage() {
  return <PmDashboardPage />;
}
