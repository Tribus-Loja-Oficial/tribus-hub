"use client";

import { useState } from "react";
import { BookOpen, FolderPlus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import {
  KnowledgeTreeDnd,
  type KnowledgeTreeHeaderCtx,
} from "@/features/knowledge/components/knowledge-tree-dnd";

export function KnowledgeListPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="max-w-5xl xl:max-w-6xl">
      <div className="mb-6">
        <PageGuide title="O que é o Knowledge?">
          <p>
            Base de conhecimento centralizada da equipe — documentação, processos, wikis e
            referências em um só lugar.
          </p>
          <GuideSection title="Nesta tela:">
            <GuideList
              items={[
                "crie pastas para organizar por área, projeto ou tema;",
                "páginas suportam texto rico com headings, listas e formatação;",
                "arraste e solte para reorganizar a hierarquia de pastas e páginas;",
                "clique em qualquer página para abrir o editor completo com painel de contexto.",
              ]}
            />
          </GuideSection>
        </PageGuide>
      </div>

      <KnowledgeTreeDnd
        variant="page"
        searchQuery={searchQuery}
        renderPageHeader={({ isLoading, stats, openCreate }: KnowledgeTreeHeaderCtx) => (
          <div className="mb-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Knowledge</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {!isLoading ? (
                    <>
                      {stats.folders} pastas <span className="text-border">·</span> {stats.pages}{" "}
                      páginas
                    </>
                  ) : (
                    "…"
                  )}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openCreate(null, true)}>
                    <FolderPlus className="h-4 w-4" />
                    Nova pasta
                  </Button>
                  <Button size="sm" onClick={() => openCreate(null, false)}>
                    <Plus className="h-4 w-4" />
                    Nova página
                  </Button>
                </div>
              </div>
            </div>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar páginas e pastas…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-md border border-input/90 bg-card/40 pl-8 pr-3 text-sm shadow-inset transition-all duration-150 placeholder:text-muted-foreground/80 hover:border-border focus:border-primary/35 focus:outline-none focus:ring-2 focus:ring-ring/35"
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}
