import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { BookOpen, FolderKanban, CheckSquare, Paperclip } from "lucide-react";
import Link from "next/link";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";

export const metadata: Metadata = { title: "Home" };

const cards = [
  {
    href: "/knowledge",
    icon: BookOpen,
    title: "Knowledge",
    description: "Wiki, documentação, processos e base de conhecimento",
  },
  {
    href: "/projects",
    icon: FolderKanban,
    title: "Projects",
    description: "Objetivos, projetos, OKRs e milestones",
  },
  {
    href: "/tasks",
    icon: CheckSquare,
    title: "Tasks",
    description: "Board kanban, execução e acompanhamento de tarefas",
  },
  {
    href: "/assets",
    icon: Paperclip,
    title: "Assets",
    description: "Upload e gestão de arquivos internos",
  },
];

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Olá, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bem-vindo ao Tribus Hub — sua fonte de verdade estratégica e documental.
        </p>
      </div>

      <div className="mb-6">
        <PageGuide title="O que é o Tribus Hub?">
          <p>
            O Tribus Hub é a fonte de verdade da equipe — tudo em um lugar: conhecimento, projetos,
            tarefas e arquivos.
          </p>
          <GuideSection title="Módulos disponíveis:">
            <GuideList
              items={[
                "Knowledge — documentação, wikis e base de conhecimento da equipe;",
                "Project Manager — projetos, milestones, OKRs e acompanhamento estratégico;",
                "Tasks — board kanban para execução e acompanhamento do trabalho;",
                "Assets — repositório de arquivos e materiais internos.",
              ]}
            />
          </GuideSection>
        </PageGuide>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="bg-primary/8 flex h-9 w-9 items-center justify-center rounded-md text-primary">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
