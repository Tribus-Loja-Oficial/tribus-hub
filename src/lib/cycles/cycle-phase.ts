import { isAfter, isBefore } from "date-fns";
import { parseCivilDateInput } from "@/lib/date/civil-date";

export type CyclePhase = "upcoming" | "running" | "ended" | "undated";

export function getCyclePhase(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  now = new Date(),
): CyclePhase {
  const start = parseCivilDateInput(startDate ?? "");
  const end = parseCivilDateInput(endDate ?? "");
  if (!start || !end) return "undated";
  if (isBefore(now, start)) return "upcoming";
  if (isAfter(now, end)) return "ended";
  return "running";
}

export function cyclePhaseLabel(phase: CyclePhase): string {
  switch (phase) {
    case "upcoming":
      return "Por vir";
    case "running":
      return "Em andamento";
    case "ended":
      return "Encerrado";
    case "undated":
      return "Sem janela";
  }
}
