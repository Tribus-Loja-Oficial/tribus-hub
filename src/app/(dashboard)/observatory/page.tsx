import type { Metadata } from "next";
import { Building2, Construction, ExternalLink, HeartPulse, Store } from "lucide-react";

export const metadata: Metadata = { title: "Observatory · Dashboard" };

const links = [
  {
    title: "Storefront",
    href: "https://tribusloja.com.br/corrida/",
    description: "Acesso direto à loja e indicadores comerciais.",
    icon: Store,
  },
  {
    title: "Platform Health",
    href: "https://tribus-monitor.vercel.app/",
    description:
      "Monitoramento técnico da infraestrutura, serviços, cobertura de testes e estabilidade operacional.",
    icon: HeartPulse,
  },
  {
    title: "Tribus ERP",
    href: "https://tribus-erp.vercel.app/",
    description: "Plataforma operacional — gestão e processos internos da Tribus.",
    icon: Building2,
  },
] as const;

export default function ObservatoryDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 via-card to-card p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="bg-primary/12 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-primary/20">
            <Construction className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Esta página está em construção. Em breve você verá indicadores e visões consolidadas
              do workspace aqui.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Atalhos rápidos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ title, href, description, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary">
                    {title}
                  </span>
                </div>
                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
              <p className="break-all font-mono text-[11px] text-muted-foreground/80">{href}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
