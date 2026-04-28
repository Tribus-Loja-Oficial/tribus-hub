"use client";

import { createContext, useContext } from "react";

/**
 * Quando o detalhe corre dentro do quick view, abrir outro `Dialog` por cima
 * (ex.: Editar projeto) quebra `<select>` nativo e outros controlos — o caminho
 * suportado é sair para a página completa e abrir o fluxo lá.
 */
export type QuickViewLeaveApi = {
  /** Fecha o quick view e navega para `href` (ex.: `/projects/slug?edit=1`). */
  leaveTo: (href: string) => void;
};

export const QuickViewLeaveContext = createContext<QuickViewLeaveApi | null>(null);

export function useQuickViewLeave(): QuickViewLeaveApi | null {
  return useContext(QuickViewLeaveContext);
}
