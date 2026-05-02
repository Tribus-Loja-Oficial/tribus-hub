import dynamic from "next/dynamic";

/** Code-split do dashboard OKR (bundle grande) para navegação mais leve. */
const OkrDashboard = dynamic(
  () =>
    import("@/features/okr/components/okr-dashboard").then((m) => ({ default: m.OkrDashboard })),
  {
    loading: () => <div className="h-32 animate-pulse rounded-xl bg-muted/50" aria-hidden />,
  },
);

export default function OkrPage() {
  return <OkrDashboard />;
}
