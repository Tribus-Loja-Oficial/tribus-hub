"use client";

import { useSession, signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, User } from "lucide-react";

export function UserMenu() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <span className="hidden sm:block max-w-[120px] truncate">{user.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-md animate-fade-in"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {user.email}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer outline-none hover:bg-accent hover:text-accent-foreground"
            onSelect={() => {}}
          >
            <User className="h-3.5 w-3.5" />
            Perfil
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer outline-none text-destructive hover:bg-destructive/10"
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
