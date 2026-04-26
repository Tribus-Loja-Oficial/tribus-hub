/**
 * Largura fixa por **tipo** de coluna, no mínimo possível que cobre o rótulo mais longo
 * (pace-health-display) + `px-2` + borda, sem forçar todas as colunas ao mesmo tamanho.
 * Status: mínimo para "Em Progresso" · Health: "Não Iniciado" / "Fora do Rumo" · Prioridade: "Urgente"/"Crítica"
 */
export const TABLE_STATUS_CHIP_PX = 120;
export const TABLE_HEALTH_CHIP_PX = 128;
export const TABLE_PRIORITY_CHIP_PX = 80;

export function tableChipBoxStyle(px: number) {
  return {
    width: px,
    minWidth: px,
    maxWidth: px,
    flexShrink: 0,
    boxSizing: "border-box" as const,
  };
}

/** Classes de alinhamento (a largura vem de `tableChipBoxStyle` + `tableChipWidthPx` nos componentes). */
export const TABLE_STATUS_CHIP_WIDTH_CLASS =
  "flex min-w-0 max-w-full justify-start overflow-hidden";
export const TABLE_HEALTH_CHIP_WIDTH_CLASS =
  "flex min-w-0 max-w-full justify-start overflow-hidden";
export const TABLE_PRIORITY_CHIP_WIDTH_CLASS =
  "flex min-w-0 max-w-full justify-center overflow-hidden";
