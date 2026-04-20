import { KeyResultDetailView } from "@/features/okr/components/key-result-detail-view";

export default async function KeyResultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KeyResultDetailView keyResultId={id} />;
}
