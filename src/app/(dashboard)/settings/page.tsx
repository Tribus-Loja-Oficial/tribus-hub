import type { Metadata } from "next";
import { Settings } from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Configurações do workspace em desenvolvimento.
      </p>
    </div>
  );
}
