"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, User } from "lucide-react";

export function UserMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="group flex items-center gap-2.5 rounded-lg py-0.5 pl-0.5 pr-2 text-sm font-medium text-foreground/85 transition-colors duration-200 hover:bg-accent/50 hover:text-foreground">
          <div className="bg-primary/12 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-primary ring-1 ring-inset ring-primary/10">
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <span className="hidden max-w-[120px] truncate sm:block">{user.name}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-[180px] animate-fade-in rounded-lg border border-border/90 bg-popover p-1 shadow-popover"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {user.email}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
            onSelect={() => {
              router.push("/profile");
            }}
          >
            <User className="h-3.5 w-3.5" />
            Meu perfil
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive/10"
            onSelect={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
