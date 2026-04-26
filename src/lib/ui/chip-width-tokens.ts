/**
 * Largura fixa do chip por coluna (status / health / prioridade), ponto base nos rótulos de
 * `pace-health-display` + `px-2` + borda. Valores 116/124/76: ajuste fino vs. iteração anterior
 * (≈−4px cada), **sem** alterar `useResizableGridColumns` (chip + `gap-2` + ícone + padding).
 */
export const TABLE_STATUS_CHIP_PX = 116;
export const TABLE_HEALTH_CHIP_PX = 124;
export const TABLE_PRIORITY_CHIP_PX = 76;

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
