import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health"];

/**
 * Cada pedido que coincide com o `matcher` corre `auth()` (incl. pedidos do App Router
 * durante navegação cliente). Isto é intencional para sessão válida em RSC.
 * Para medir impacto: `NEXT_PUBLIC_NAV_PERF=1` no cliente + DevTools Performance;
 * otimizações (cache de sessão no edge, etc.) exigem revisão de segurança explícita.
 */
const STATIC_PUBLIC_PATH_RE =
  /\.(?:svg|png|jpe?g|gif|webp|ico|json|woff2?|ttf|eot|webmanifest|txt|map)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ficheiros em `public/` — não exigir sessão (evita redirect HTML no `next/image` / login sem cookie)
  if (STATIC_PUBLIC_PATH_RE.test(pathname)) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const session = await auth();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/webpack|favicon.ico|public/).*)"],
};
