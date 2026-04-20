import { CycleDetailView } from "@/features/okr/components/cycle-detail-view";

export default async function CycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CycleDetailView cycleId={id} />;
}
