import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Perfil" };

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, email, image, role } = session.user;
  const displayName = name?.trim() || email || "Utilizador";
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : "—";

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        <User className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Meu perfil</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatares OAuth (domínios variados)
            <img
              src={image}
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/12 text-2xl font-semibold text-primary ring-1 ring-inset ring-primary/15">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nome
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{displayName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                E-mail
              </p>
              <p className="mt-0.5 break-all text-sm text-foreground">{email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Função no workspace
              </p>
              <p className="mt-0.5 text-sm text-foreground">{roleLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            Preferências e integrações do workspace ficam em{" "}
            <span className="font-medium text-foreground">Configurações</span>.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/settings" className="inline-flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              Abrir configurações
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
