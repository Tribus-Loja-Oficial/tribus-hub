/** Mostra 1 casa decimal para evitar 99.5% parecer 100%. */
export function formatOkrProgressPercent(value: number): string {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  const rounded1 = Math.round(safe * 10) / 10;
  const isInt = Math.abs(rounded1 - Math.round(rounded1)) < 1e-9;
  return `${isInt ? Math.round(rounded1) : rounded1.toFixed(1)}%`;
}
