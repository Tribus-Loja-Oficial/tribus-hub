"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Telescope,
  BookOpen,
  Target,
  CheckSquare,
  Paperclip,
  Settings,
  CalendarRange,
  LayoutDashboard,
  List,
  FolderKanban,
  FileText,
  Folder,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UserMenu } from "./user-menu";

// ─── Knowledge tree ───────────────────────────────────────────────────────────

type KnowledgeNode = {
  id: string;
  title: string;
  isFolder: boolean;
  icon: string | null;
  children: KnowledgeNode[];
};

function KnowledgeItem({
  node,
  depth,
  pathname,
}: {
  node: KnowledgeNode;
  depth: number;
  pathname: string;
}) {
  const isActive = pathname.startsWith(`/knowledge/${node.id}`);
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(() => isActive && hasChildren);

  const indent = 8 + depth * 12;
  const iconEl = node.isFolder ? (
    <Folder className="h-3 w-3 shrink-0 text-amber-700/55 dark:text-amber-500/60" />
  ) : (
    <FileText className="h-3 w-3 shrink-0 text-muted-foreground/45" />
  );
  const label = `${node.icon ? `${node.icon} ` : ""}${node.title}`;

  return (
    <div>
      <div
        style={{ paddingLeft: `${indent}px` }}
        className={cn(
          "group flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-xs font-medium transition-colors",
          isActive && !node.isFolder
            ? "bg-primary/[0.08] text-sidebar-accent-foreground ring-1 ring-inset ring-primary/10 dark:ring-primary/20"
            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
        )}
      >
        {/* Expand indicator */}
        {hasChildren ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors hover:bg-sidebar-accent/60"
          >
            <svg
              viewBox="0 0 6 6"
              className={cn(
                "h-1.5 w-1.5 fill-muted-foreground/50 transition-transform duration-150",
                open && "rotate-90",
              )}
            >
              <polygon points="0,0 6,3 0,6" />
            </svg>
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {/* Icon + title — always navigates */}
        <Link href={`/knowledge/${node.id}`} className="flex min-w-0 flex-1 items-center gap-1.5">
          {iconEl}
          <span className="truncate">{label}</span>
        </Link>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <KnowledgeItem key={child.id} node={child} depth={depth + 1} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────

const okrSubItems = [
  { href: "/okr", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/okr/okrs", label: "OKRs", icon: List },
  { href: "/okr/cycles", label: "Ciclos", icon: CalendarRange },
];

const pmSubItems = [
  { href: "/projects", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/projects/list", label: "Projects", icon: List },
  /** Projetos por ciclo (mesmo papel que OKR Manager → Ciclos para OKRs). */
  { href: "/projects/cycles", label: "Ciclos", icon: CalendarRange },
];

const observatorySubItems = [
  { href: "/observatory", label: "Dashboard", icon: LayoutDashboard, exact: true },
  /** Visão global: objetivos OKR + projetos por ciclo (workspace). */
  {
    href: "/observatory/cycles",
    label: "Ciclos gerais",
    icon: CalendarRange,
    exact: false as const,
  },
] as const;

const bottomNavItems = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/assets", label: "Assets", icon: Paperclip },
];

const bottomItems = [{ href: "/settings", label: "Configurações", icon: Settings }];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname();
  const {
    href: workspaceCyclesHref,
    label: workspaceCyclesLabel,
    icon: WorkspaceCyclesNavIcon,
  } = workspaceCyclesNav;
  const [sidebarWidth, setSidebarWidth] = useState(232);
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onResizePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setSidebarWidth((w) => Math.max(180, Math.min(400, w + e.clientX - lastX.current)));
    lastX.current = e.clientX;
  };
  const onResizePointerUp = () => {
    dragging.current = false;
  };

  const isObservatoryActive = pathname.startsWith("/observatory");
  const isOkrActive = pathname.startsWith("/okr");
  const isPmActive = pathname.startsWith("/projects");
  const isKnowledgeActive = pathname.startsWith("/knowledge");

  const [observatoryOpen, setObservatoryOpen] = useState(isObservatoryActive);
  const [okrOpen, setOkrOpen] = useState(isOkrActive);
  const [pmOpen, setPmOpen] = useState(isPmActive);
  const [knowledgeOpen, setKnowledgeOpen] = useState(isKnowledgeActive);

  const showObservatorySub = isObservatoryActive || observatoryOpen;
  const showOkrSub = isOkrActive || okrOpen;
  const showPmSub = isPmActive || pmOpen;
  const showKnowledgeSub = isKnowledgeActive || knowledgeOpen;

  const { data: treeRes, isLoading: treeLoading } = useQuery<{ data: KnowledgeNode[] }>({
    queryKey: ["knowledge-tree-sidebar"],
    queryFn: () => fetch("/api/knowledge/tree").then((r) => r.json()),
    staleTime: 60_000,
    enabled: showKnowledgeSub,
  });
  const knowledgeTree = treeRes?.data ?? [];

  const navItemClass = (active: boolean) =>
    cn(
      "group flex items-center gap-3 rounded-lg border-l-2 py-2.5 pl-[calc(0.625rem-2px)] pr-2.5 text-sm font-medium transition-all duration-200 ease-out",
      active
        ? "border-primary/90 bg-primary/[0.07] text-sidebar-accent-foreground shadow-sm shadow-black/[0.03] dark:bg-primary/10 dark:shadow-black/20"
        : "border-transparent text-sidebar-foreground/78 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
    );

  const iconClass = (active: boolean) =>
    cn(
      "h-4 w-4 shrink-0 transition-opacity",
      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80",
    );

  const subItemClass = (active: boolean) =>
    cn(
      "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all duration-200 ease-out",
      active
        ? "bg-primary/[0.08] text-sidebar-accent-foreground shadow-sm shadow-black/[0.02] ring-1 ring-inset ring-primary/10 dark:ring-primary/20"
        : "text-sidebar-foreground/68 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
    );

  const subIconClass = (active: boolean) =>
    cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground/70");

  return (
    <>
      <aside
        className="flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
        style={{ width: sidebarWidth }}
      >
        {/* Logo */}
        <div className="flex min-h-[3.25rem] items-center gap-3 border-b border-sidebar-border/90 bg-sidebar/80 px-4 py-2 shadow-inset">
          <Image
            src="/tribus-hub-icon.png"
            alt=""
            width={32}
            height={32}
            priority
            aria-hidden
            className="h-8 w-8 shrink-0 self-center rounded-lg object-contain shadow-sm ring-1 ring-black/[0.06] dark:ring-white/10"
          />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              Tribus Hub
            </span>
            <span
              className="mt-0.5 block truncate text-[10px] font-medium leading-tight tracking-wide text-muted-foreground/85"
              title="Plataforma Estratégica"
            >
              Plataforma Estratégica
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
          <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">
            Navegação
          </p>

          {/* Observatory — dashboard + workspace cycles */}
          <div className="pt-1">
            <div className={cn(navItemClass(isObservatoryActive), "pr-1")}>
              <Link href="/observatory" className="flex min-w-0 flex-1 items-center gap-3">
                <Telescope className={iconClass(isObservatoryActive)} />
                <span className="flex-1 truncate">Observatory</span>
              </Link>
              <button
                type="button"
                onClick={() => setObservatoryOpen((v) => !v)}
                className="shrink-0 rounded p-1 transition-colors hover:bg-sidebar-accent/60"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-150",
                    showObservatorySub && "rotate-90",
                  )}
                />
              </button>
            </div>
            {showObservatorySub && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                {observatorySubItems.map(({ href, label, icon: Icon, exact }) => {
                  const isActive = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link key={href} href={href} className={subItemClass(isActive)}>
                      <Icon className={subIconClass(isActive)} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* OKR Manager */}
          <div className="pt-1">
            <div className={cn(navItemClass(isOkrActive), "pr-1")}>
              <Link href="/okr" className="flex min-w-0 flex-1 items-center gap-3">
                <Target className={iconClass(isOkrActive)} />
                <span className="flex-1 truncate">OKR Manager</span>
              </Link>
              <button
                onClick={() => setOkrOpen((v) => !v)}
                className="shrink-0 rounded p-1 transition-colors hover:bg-sidebar-accent/60"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-150",
                    showOkrSub && "rotate-90",
                  )}
                />
              </button>
            </div>
            {showOkrSub && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                {okrSubItems.map(({ href, label, icon: Icon, exact }) => {
                  const isOkrsRoute = href === "/okr/okrs";
                  const isActive = exact
                    ? pathname === href
                    : isOkrsRoute
                      ? pathname.startsWith("/okr/okrs") ||
                        pathname.startsWith("/okr/objectives") ||
                        pathname.startsWith("/okr/key-results")
                      : pathname.startsWith(href) && pathname !== "/okr";
                  return (
                    <Link key={href} href={href} className={subItemClass(isActive)}>
                      <Icon className={subIconClass(isActive)} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="pt-1">
            <div className={cn(navItemClass(isPmActive), "pr-1")}>
              <Link href="/projects" className="flex min-w-0 flex-1 items-center gap-3">
                <FolderKanban className={iconClass(isPmActive)} />
                <span className="flex-1 truncate">Project Manager</span>
              </Link>
              <button
                onClick={() => setPmOpen((v) => !v)}
                className="shrink-0 rounded p-1 transition-colors hover:bg-sidebar-accent/60"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-150",
                    showPmSub && "rotate-90",
                  )}
                />
              </button>
            </div>
            {showPmSub && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                {pmSubItems.map(({ href, label, icon: Icon, exact }) => {
                  const isActive = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link key={href} href={href} className={subItemClass(isActive)}>
                      <Icon className={subIconClass(isActive)} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tasks */}
          {bottomNavItems.slice(0, 1).map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={navItemClass(active)}>
                <Icon className={iconClass(active)} />
                {label}
              </Link>
            );
          })}

          {/* Knowledge */}
          <div className="pt-1">
            <div className={cn(navItemClass(isKnowledgeActive), "pr-1")}>
              <Link href="/knowledge" className="flex min-w-0 flex-1 items-center gap-3">
                <BookOpen className={iconClass(isKnowledgeActive)} />
                <span className="flex-1 truncate">Knowledge</span>
              </Link>
              <button
                onClick={() => setKnowledgeOpen((v) => !v)}
                className="shrink-0 rounded p-1 transition-colors hover:bg-sidebar-accent/60"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-150",
                    showKnowledgeSub && "rotate-90",
                  )}
                />
              </button>
            </div>
            {showKnowledgeSub && (
              <div className="ml-4 mt-0.5 border-l border-sidebar-border pl-3">
                {treeLoading ? (
                  <div className="flex items-center gap-1.5 px-2 py-2">
                    <svg
                      className="h-3 w-3 animate-spin text-muted-foreground/40"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    <span className="text-[11px] text-muted-foreground/40">Carregando...</span>
                  </div>
                ) : knowledgeTree.length === 0 ? (
                  <p className="px-2 py-2 text-[11px] text-muted-foreground/40">
                    Sem páginas ainda.
                  </p>
                ) : (
                  knowledgeTree.map((node) => (
                    <KnowledgeItem key={node.id} node={node} depth={0} pathname={pathname} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Assets */}
          {bottomNavItems.slice(1).map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={navItemClass(active)}>
                <Icon className={iconClass(active)} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: settings */}
        <div className="space-y-1 border-t border-sidebar-border px-2 pb-2 pt-3">
          <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">
            Sistema
          </p>
          {bottomItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={navItemClass(active)}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground/80" />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto border-t border-sidebar-border bg-sidebar-accent/20 px-2 py-3">
          <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">
            Conta
          </p>
          <div className="px-1 [&_button]:w-full [&_button]:justify-start [&_button]:rounded-lg [&_button]:py-2">
            <UserMenu />
          </div>
        </div>
      </aside>

      {/* Resize handle — cor fixa #000 para não variar com tema/contraste */}
      <div
        className="shrink-0 cursor-col-resize touch-none select-none"
        style={{ width: 5, backgroundColor: "#000000" }}
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
      />
    </>
  );
}
