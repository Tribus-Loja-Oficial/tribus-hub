import { ObjectiveDetailView } from "@/features/okr/components/objective-detail-view";

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ObjectiveDetailView objectiveId={id} />;
}
