"use client";

/**
 * Outlet do dashboard: o feedback de navegação fica no `NavigationProgress` e nos
 * `loading.tsx` por segmento — evita desmontar `children` (bloqueava streaming/RSC).
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
