import { Suspense } from "react";
import { OkrPage } from "@/features/okr/components/okr-page";

export default function OkrsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando OKRs…</div>}>
      <OkrPage />
    </Suspense>
  );
}
