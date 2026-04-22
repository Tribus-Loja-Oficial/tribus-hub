"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useNavigationState } from "./navigation-context";

const SEGMENT_LABELS: Record<string, string> = {
  knowledge: "Knowledge",
  projects: "Project Manager",
  list: "Projects",
  tasks: "Tasks",
  assets: "Assets",
  settings: "Configurações",
  login: "Entrar",
  okr: "OKR Manager",
  okrs: "OKRs",
  cycles: "Ciclos",
};

// Segments that redirect to a different href in the breadcrumb
const SEGMENT_REDIRECTS: Record<string, string> = {
  "key-results": "/okr/okrs",
  objectives: "/okr/okrs",
};

// Labels for redirected segments
const REDIRECT_LABELS: Record<string, string> = {
  "key-results": "OKRs",
  objectives: "OKRs",
};

function looksLikeId(segment: string) {
  return segment.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(segment);
}

export function AppBreadcrumbs() {
  const rawPathname = usePathname();
  const { pendingPathname } = useNavigationState();
  const pathname = pendingPathname ?? rawPathname;
  const segments = pathname.split("/").filter(Boolean);

  if (pathname === "/okr" || pathname === "/okr/") {
    return (
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        <span className="flex min-w-0 items-center gap-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Início</span>
          </Link>
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <span className="flex min-w-0 items-center gap-1">
          <Link
            href="/okr"
            className="max-w-[140px] truncate text-muted-foreground transition-colors hover:text-foreground"
          >
            OKR Manager
          </Link>
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <span className="max-w-[200px] truncate font-semibold tracking-tight text-foreground sm:max-w-[280px]">
          Dashboard
        </span>
      </nav>
    );
  }

  const crumbs: { href: string; label: string }[] = [{ href: "/", label: "Início" }];

  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    acc += `/${seg}`;
    const prev = i > 0 ? segments[i - 1] : undefined;

    if (SEGMENT_REDIRECTS[seg]) {
      crumbs.push({ href: SEGMENT_REDIRECTS[seg]!, label: REDIRECT_LABELS[seg]! });
      continue;
    }

    const label = looksLikeId(seg)
      ? prev === "projects"
        ? "Projeto"
        : prev === "knowledge"
          ? "Página"
          : prev === "objectives"
            ? "Objetivo"
            : prev === "key-results"
              ? "Key result"
              : prev === "cycles"
                ? "Ciclo"
                : "Detalhe"
      : (SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1));
    crumbs.push({ href: acc, label });
  }

  if (crumbs.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Home className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="font-semibold tracking-tight text-foreground/85">Workspace</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {crumbs.map((c, idx) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1">
          {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
          {idx === crumbs.length - 1 ? (
            <span className="max-w-[200px] truncate font-semibold tracking-tight text-foreground sm:max-w-[280px]">
              {c.label}
            </span>
          ) : (
            <Link
              href={c.href}
              className={cn(
                "max-w-[140px] truncate text-muted-foreground transition-colors hover:text-foreground",
                idx === 0 && "inline-flex items-center gap-1",
              )}
            >
              {idx === 0 ? (
                <>
                  <Home className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{c.label}</span>
                </>
              ) : (
                c.label
              )}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
