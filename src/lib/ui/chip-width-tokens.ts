/**
 * Largura fixa do chip por coluna (status / health / prioridade), ponto base nos rótulos de
 * `pace-health-display` + `px-2` + borda. **sem** alterar colunas do grid.
 */
export const TABLE_STATUS_CHIP_PX = 96;
export const TABLE_HEALTH_CHIP_PX = 100;
export const TABLE_PRIORITY_CHIP_PX = 60;

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
