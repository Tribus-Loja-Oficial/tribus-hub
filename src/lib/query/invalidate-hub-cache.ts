import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate caches after any OKR key result change (progress update, edit, create, delete)
 * so detail pages, lists, dashboard, cycle views and PM surfaces refetch together.
 */
export function invalidateAfterKeyResultMutation(
  queryClient: QueryClient,
  input: {
    keyResultId?: string;
    /** When omitted (e.g. bulk delete), all objective detail queries are invalidated. */
    objectiveId?: string;
    cycleId?: string | null;
  },
): void {
  const { keyResultId, objectiveId, cycleId } = input;
  if (keyResultId) {
    void queryClient.invalidateQueries({ queryKey: ["okr-key-result", keyResultId] });
    void queryClient.invalidateQueries({ queryKey: ["okr-kr-updates", keyResultId] });
  }
  void queryClient.invalidateQueries({ queryKey: ["okr-key-results"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
  if (objectiveId) {
    void queryClient.invalidateQueries({ queryKey: ["okr-objective", objectiveId] });
  } else {
    void queryClient.invalidateQueries({ queryKey: ["okr-objective"] });
  }
  void queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
  if (cycleId) {
    void queryClient.invalidateQueries({ queryKey: ["okr-cycle", cycleId] });
  }
  void queryClient.invalidateQueries({ queryKey: ["okr-key-results-all"] });
  void queryClient.invalidateQueries({ queryKey: ["project-hub"] });
  void queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
  void queryClient.invalidateQueries({ queryKey: ["project-okr-links"] });
}

/**
 * Invalidate caches after objective create/update/delete (metadata or contained KRs may change elsewhere).
 */
export function invalidateAfterObjectiveMutation(
  queryClient: QueryClient,
  input: { objectiveId: string; cycleId?: string | null },
): void {
  const { objectiveId, cycleId } = input;
  void queryClient.invalidateQueries({ queryKey: ["okr-objective", objectiveId] });
  void queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-key-results"] });
  if (cycleId) {
    void queryClient.invalidateQueries({ queryKey: ["okr-cycle", cycleId] });
  }
  void queryClient.invalidateQueries({ queryKey: ["okr-key-results-all"] });
  void queryClient.invalidateQueries({ queryKey: ["project-hub"] });
  void queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
  void queryClient.invalidateQueries({ queryKey: ["project-okr-links"] });
}

/** After cycle-level OKR changes (create, edit dates/status, etc.). */
export function invalidateAfterCycleMutation(
  queryClient: QueryClient,
  input: { cycleId?: string },
): void {
  if (input.cycleId) {
    void queryClient.invalidateQueries({ queryKey: ["okr-cycle", input.cycleId] });
  }
  void queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-key-results"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-objective"] });
  void queryClient.invalidateQueries({ queryKey: ["okr-key-results-all"] });
  void queryClient.invalidateQueries({ queryKey: ["project-hub"] });
  void queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
}
