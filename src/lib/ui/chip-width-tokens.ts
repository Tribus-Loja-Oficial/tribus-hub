/** Largura fixa do “chip” em tabelas; aplicar com `tableChipBoxStyle` (inline) para vencer `min-w-0` do grid. */
export const TABLE_STATUS_CHIP_PX = 140;
export const TABLE_HEALTH_CHIP_PX = 140;
export const TABLE_PRIORITY_CHIP_PX = 108;

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
