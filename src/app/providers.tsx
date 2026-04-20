"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 3 * 60 * 1000,   // 3 min — dados ficam "frescos" por mais tempo
            gcTime: 10 * 60 * 1000,     // 10 min — cache sobrevive navegação entre abas
            refetchOnWindowFocus: false, // não refaz fetch ao clicar em dialogs/modal
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
