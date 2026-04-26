/**
 * "completed" exige progresso 100% (meta atingida). Caso contrario, reabre (default on_track)
 * para nao manter health_snapshot congelado com dados obsoletos. Usar em toda a escrita de OKR
 * (KRs, objectives, batch updates) e alinhar com effectiveOkrStatusForPaceAndWorkflow em leitura.
 */
export function resolveOkrStatusAfterProgress(
  inputStatus: string | undefined,
  prevStatus: string,
  progress: number,
): string {
  const status = inputStatus !== undefined ? String(inputStatus) : prevStatus;
  if (progress >= 100) {
    return "completed";
  }
  if (status === "completed" || prevStatus === "completed") {
    if (inputStatus !== undefined && String(inputStatus) !== "completed") {
      return String(inputStatus);
    }
    return "on_track";
  }
  return status;
}

/**
 * Invariantes: Health em OKR so é congelado (health_snapshot_json) com status "completed" E
 * progresso 100% no sentido de meta atingida. Se o progresso cair, o registo nao pode continuar
 * "completed" a usar snapshot: senao a API devolve Health antigo (bug).
 */
export function effectiveOkrStatusForPaceAndWorkflow(
  status: string,
  progressPercent: number,
): string {
  const s = String(status ?? "draft");
  if (s === "completed" && progressPercent < 100) {
    return "on_track";
  }
  return s;
}

/**
 * Usar health_snapshot so quando concluido e progresso 100% (meta). Caso contrario, ignora
 * sujeira no banco (json com status nao-completed) ou (completed, p<100).
 */
export function effectiveHealthSnapshotForOkrPace(
  status: string,
  progressPercent: number,
  healthSnapshotJson: string | null,
): string | null {
  if (String(status) === "completed" && progressPercent >= 100) {
    return healthSnapshotJson ?? null;
  }
  return null;
}
